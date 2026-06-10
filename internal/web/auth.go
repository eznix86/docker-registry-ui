package web

import (
	"context"
	crand "crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	clog "github.com/charmbracelet/log"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gorilla/securecookie"
	"golang.org/x/oauth2"
)

const (
	sessionCookieName = "container-hub-session"
	stateCookieName   = "container-hub-state"
	stateMaxAge       = 300
)

type AuthConfig struct {
	IssuerURL           string
	ClientID            string
	ClientSecret        string
	RedirectURI         string
	SessionSecret       string
	AllowedEmails       string
	AllowedEmailDomains string
	AllowedGroups       string
	AllowedRoles        string
	ClaimEmail          string
	ClaimGroups         string
	ClaimRoles          string
	ClaimName           string
	SessionMaxAge       time.Duration
}

func (c AuthConfig) Enabled() bool {
	return c.IssuerURL != ""
}

type AuthHandler struct {
	config        AuthConfig
	provider      *oidc.Provider
	oauth2Config  *oauth2.Config
	verifier      *oidc.IDTokenVerifier
	cookies       *securecookie.SecureCookie
	logger        *clog.Logger
	allowed       authzRules
	secureCookie  bool
	sessionMaxAge time.Duration
}

type authzRules struct {
	emails       map[string]struct{}
	emailDomains map[string]struct{}
	groups       map[string]struct{}
	roles        map[string]struct{}
}

type sessionClaims struct {
	Subject string   `json:"sub"`
	Email   string   `json:"email"`
	Name    string   `json:"name"`
	Groups  []string `json:"groups,omitempty"`
	Roles   []string `json:"roles,omitempty"`
	Expires int64    `json:"expires"`
}

type SessionUser struct {
	Subject string   `json:"sub"`
	Email   string   `json:"email"`
	Name    string   `json:"name"`
	Groups  []string `json:"groups,omitempty"`
	Roles   []string `json:"roles,omitempty"`
}

type contextKey string

const userContextKey contextKey = "oidc-user"

func UserFromContext(ctx context.Context) (*SessionUser, bool) {
	u, ok := ctx.Value(userContextKey).(*SessionUser)
	return u, ok
}

func NewAuthHandler(ctx context.Context, cfg AuthConfig, logger *clog.Logger) (*AuthHandler, error) {
	a := &AuthHandler{
		config:        cfg,
		logger:        logger,
		allowed:       parseAuthzRules(cfg),
		secureCookie:  shouldSecureCookies(cfg.RedirectURI),
		sessionMaxAge: cfg.SessionMaxAge,
	}
	if a.sessionMaxAge <= 0 {
		a.sessionMaxAge = 24 * time.Hour
	}

	if !cfg.Enabled() {
		return a, nil
	}

	provider, err := oidc.NewProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("oidc init from issuer %q: %w", cfg.IssuerURL, err)
	}
	a.provider = provider

	a.oauth2Config = &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	a.verifier = provider.Verifier(&oidc.Config{ClientID: cfg.ClientID})

	key := deriveKey(cfg)
	a.cookies = securecookie.New(key, nil)

	return a, nil
}

func (a *AuthHandler) Enabled() bool { return a.config.Enabled() }

func (a *AuthHandler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.Enabled() {
			next.ServeHTTP(w, r)
			return
		}

		user, err := a.readSession(r)
		if err != nil {
			if isPageRequest(r) {
				http.Redirect(w, r, "/oauth/login", http.StatusFound)
			} else {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
			}
			return
		}
		if err := a.authorize(user); err != nil {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if !a.Enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	state, err := randomHex(32)
	if err != nil {
		a.logger.Error("oidc state generation failed", "error", err)
		http.Error(w, "failed to create login state", http.StatusInternalServerError)
		return
	}
	if err := a.writeStateCookie(w, state); err != nil {
		http.Error(w, "failed to create state cookie", http.StatusInternalServerError)
		return
	}

	authURL := a.oauth2Config.AuthCodeURL(state)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (a *AuthHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	if !a.Enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	q := r.URL.Query()
	if errType := q.Get("error"); errType != "" {
		desc := q.Get("error_description")
		a.logger.Error("oidc callback error", "error", errType, "description", desc)
		http.Redirect(w, r, callbackErrorPath(errType), http.StatusFound)
		return
	}

	if err := a.verifyState(r, q.Get("state")); err != nil {
		a.logger.Error("oidc state verification failed", "error", err)
		http.Error(w, "invalid state", http.StatusForbidden)
		return
	}

	oauth2Token, err := a.oauth2Config.Exchange(r.Context(), q.Get("code"))
	if err != nil {
		a.logger.Error("oidc code exchange failed", "error", err)
		http.Error(w, "authentication failed", http.StatusInternalServerError)
		return
	}

	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "no id_token in response", http.StatusInternalServerError)
		return
	}

	idToken, err := a.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		a.logger.Error("oidc id_token verification failed", "error", err)
		http.Error(w, "token verification failed", http.StatusInternalServerError)
		return
	}

	var rawClaims map[string]any
	if err := idToken.Claims(&rawClaims); err != nil {
		a.logger.Error("oidc claim extraction failed", "error", err)
		http.Error(w, "failed to extract claims", http.StatusInternalServerError)
		return
	}

	user := extractUser(rawClaims, a.config)
	if err := a.authorize(user); err != nil {
		a.logger.Warn("oidc user not authorized",
			"sub", user.Subject,
			"email", user.Email,
			"reason", err,
		)
		http.Error(w, "access denied: "+err.Error(), http.StatusForbidden)
		return
	}

	if err := a.writeSessionCookie(w, user); err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	a.clearStateCookie(w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (a *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if !a.Enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	a.clearSessionCookie(w)

	endSessionURL, err := a.endSessionEndpoint()
	if err != nil {
		a.logger.Debug("no end_session_endpoint in OIDC discovery", "error", err)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	http.Redirect(w, r, endSessionURL, http.StatusFound)
}

func (a *AuthHandler) endSessionEndpoint() (string, error) {
	var claims struct {
		EndSessionEndpoint string `json:"end_session_endpoint"`
	}
	if err := a.provider.Claims(&claims); err != nil {
		return "", err
	}
	if claims.EndSessionEndpoint == "" {
		return "", errors.New("end_session_endpoint not found")
	}
	return claims.EndSessionEndpoint, nil
}

func (a *AuthHandler) readSession(r *http.Request) (*SessionUser, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil, err
	}
	var claims sessionClaims
	if err := a.cookies.Decode(sessionCookieName, cookie.Value, &claims); err != nil {
		return nil, err
	}
	if claims.Expires <= time.Now().Unix() {
		return nil, errors.New("session expired")
	}
	return &SessionUser{
		Subject: claims.Subject,
		Email:   claims.Email,
		Name:    claims.Name,
		Groups:  claims.Groups,
		Roles:   claims.Roles,
	}, nil
}

func (a *AuthHandler) writeSessionCookie(w http.ResponseWriter, user *SessionUser) error {
	encoded, err := a.cookies.Encode(sessionCookieName, sessionClaims{
		Subject: user.Subject,
		Email:   user.Email,
		Name:    user.Name,
		Groups:  user.Groups,
		Roles:   user.Roles,
		Expires: time.Now().Add(a.sessionMaxAge).Unix(),
	})
	if err != nil {
		return err
	}
	// #nosec G124 -- Secure is inferred from OIDC_REDIRECT_URI so local HTTP development keeps working.
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    encoded,
		Path:     "/",
		MaxAge:   int(a.sessionMaxAge.Seconds()),
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (a *AuthHandler) clearSessionCookie(w http.ResponseWriter) {
	// #nosec G124 -- Secure is inferred from OIDC_REDIRECT_URI so local HTTP development keeps working.
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *AuthHandler) writeStateCookie(w http.ResponseWriter, state string) error {
	encoded, err := a.cookies.Encode(stateCookieName, state)
	if err != nil {
		return err
	}
	// #nosec G124 -- Secure is inferred from OIDC_REDIRECT_URI so local HTTP development keeps working.
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    encoded,
		Path:     "/oauth/",
		MaxAge:   stateMaxAge,
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (a *AuthHandler) verifyState(r *http.Request, state string) error {
	cookie, err := r.Cookie(stateCookieName)
	if err != nil {
		return fmt.Errorf("state cookie missing: %w", err)
	}
	var decoded string
	if err := a.cookies.Decode(stateCookieName, cookie.Value, &decoded); err != nil {
		return fmt.Errorf("state cookie decode: %w", err)
	}
	if decoded != state {
		return errors.New("state mismatch")
	}
	return nil
}

func (a *AuthHandler) clearStateCookie(w http.ResponseWriter) {
	// #nosec G124 -- Secure is inferred from OIDC_REDIRECT_URI so local HTTP development keeps working.
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    "",
		Path:     "/oauth/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *AuthHandler) authorize(user *SessionUser) error {
	if len(a.allowed.emails) == 0 &&
		len(a.allowed.emailDomains) == 0 &&
		len(a.allowed.groups) == 0 &&
		len(a.allowed.roles) == 0 {
		return nil
	}

	var reasons []string

	if len(a.allowed.emails) > 0 {
		if _, ok := a.allowed.emails[user.Email]; !ok {
			reasons = append(reasons, "email not in allowlist")
		}
	}

	if len(a.allowed.emailDomains) > 0 {
		parts := strings.SplitN(user.Email, "@", 2)
		if len(parts) != 2 {
			reasons = append(reasons, "invalid email format")
		} else if _, ok := a.allowed.emailDomains[parts[1]]; !ok {
			reasons = append(reasons, "email domain not in allowlist")
		}
	}

	if len(a.allowed.groups) > 0 {
		if !anyMatch(a.allowed.groups, user.Groups) {
			reasons = append(reasons, "no matching group")
		}
	}

	if len(a.allowed.roles) > 0 {
		if !anyMatch(a.allowed.roles, user.Roles) {
			reasons = append(reasons, "no matching role")
		}
	}

	if len(reasons) > 0 {
		return errors.New(strings.Join(reasons, "; "))
	}
	return nil
}

func anyMatch(allowed map[string]struct{}, values []string) bool {
	for _, v := range values {
		if _, ok := allowed[v]; ok {
			return true
		}
	}
	return false
}

func extractUser(claims map[string]any, cfg AuthConfig) *SessionUser {
	return &SessionUser{
		Subject: getStringClaim(claims, "sub"),
		Email:   getStringClaim(claims, cfg.ClaimEmail),
		Name:    getStringClaim(claims, cfg.ClaimName),
		Groups:  getStringSliceClaim(claims, cfg.ClaimGroups),
		Roles:   getStringSliceClaim(claims, cfg.ClaimRoles),
	}
}

func getStringClaim(claims map[string]any, key string) string {
	v, ok := getClaimValue(claims, key)
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}

func getStringSliceClaim(claims map[string]any, key string) []string {
	v, ok := getClaimValue(claims, key)
	if !ok {
		return nil
	}
	switch val := v.(type) {
	case []any:
		out := make([]string, 0, len(val))
		for _, item := range val {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	case string:
		return []string{val}
	case []string:
		return val
	}
	return nil
}

func getClaimValue(claims map[string]any, key string) (any, bool) {
	if key == "" {
		return nil, false
	}

	var current any = claims
	for part := range strings.SplitSeq(key, ".") {
		claimMap, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		current, ok = claimMap[part]
		if !ok {
			return nil, false
		}
	}

	return current, true
}

func parseAuthzRules(cfg AuthConfig) authzRules {
	return authzRules{
		emails:       parseSet(cfg.AllowedEmails),
		emailDomains: parseSet(cfg.AllowedEmailDomains),
		groups:       parseSet(cfg.AllowedGroups),
		roles:        parseSet(cfg.AllowedRoles),
	}
}

func parseSet(s string) map[string]struct{} {
	if s == "" {
		return nil
	}
	set := make(map[string]struct{})
	for part := range strings.SplitSeq(s, ",") {
		part = strings.TrimSpace(part)
		if part != "" {
			set[part] = struct{}{}
		}
	}
	return set
}

func deriveKey(cfg AuthConfig) []byte {
	h := sha256.Sum256([]byte(cfg.SessionSecret))
	return h[:]
}

func isPageRequest(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept"), "text/html")
}

func callbackErrorPath(errorType string) string {
	values := url.Values{}
	values.Set("auth_error", errorType)
	return "/?" + values.Encode()
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := crand.Read(b); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func shouldSecureCookies(redirectURI string) bool {
	parsed, err := url.Parse(redirectURI)
	if err != nil {
		return false
	}
	return parsed.Scheme == "https"
}
