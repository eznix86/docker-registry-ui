package app

import (
	"errors"
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/joho/godotenv"
	"github.com/spf13/pflag"
)

const (
	logLevelWarn  = "warn"
	logLevelInfo  = "info"
	logLevelDebug = "debug"

	flagDebug = "debug"
)

type Config struct {
	App           AppConfig
	Server        ServerConfig
	Scraper       ScraperConfig
	Database      DatabaseConfig
	OIDC          OIDCConfig
	SessionSecret string        `env:"SESSION_SECRET"`
	SessionMaxAge time.Duration `env:"SESSION_MAX_AGE" envDefault:"24h"`
	RegistryList  []registry.Config
}

type OIDCConfig struct {
	IssuerURL           string `env:"OIDC_ISSUER_URL"`
	ClientID            string `env:"OIDC_CLIENT_ID"`
	ClientSecret        string `env:"OIDC_CLIENT_SECRET"`
	RedirectURI         string `env:"OIDC_REDIRECT_URI"`
	AllowedEmails       string `env:"OIDC_ALLOWED_EMAILS"`
	AllowedEmailDomains string `env:"OIDC_ALLOWED_EMAIL_DOMAINS"`
	AllowedGroups       string `env:"OIDC_ALLOWED_GROUPS"`
	AllowedRoles        string `env:"OIDC_ALLOWED_ROLES"`
	ClaimEmail          string `env:"OIDC_CLAIM_EMAIL" envDefault:"email"`
	ClaimGroups         string `env:"OIDC_CLAIM_GROUPS" envDefault:"groups"`
	ClaimRoles          string `env:"OIDC_CLAIM_ROLES" envDefault:"roles"`
	ClaimName           string `env:"OIDC_CLAIM_NAME" envDefault:"name"`
}

func (c OIDCConfig) Enabled() bool {
	return c.IssuerURL != ""
}

func (c OIDCConfig) Validate() error {
	if !c.Enabled() {
		return nil
	}
	if c.ClientID == "" {
		return errors.New("OIDC_CLIENT_ID is required when OIDC_ISSUER_URL is set")
	}
	if c.ClientSecret == "" {
		return errors.New("OIDC_CLIENT_SECRET is required when OIDC_ISSUER_URL is set")
	}
	if c.RedirectURI == "" {
		return errors.New("OIDC_REDIRECT_URI is required when OIDC_ISSUER_URL is set")
	}
	return nil
}

type AppConfig struct {
	VerboseLevel       string `env:"APP_VERBOSE_LEVEL" envDefault:"warn"`
	VerboseCount       int    `flag:"verbose"`
	Debug              bool   `env:"APP_DEBUG" envDefault:"false" flag:"debug"`
	DisableTagDeletion bool   `env:"DISABLE_TAG_DELETION" envDefault:"false"`
	ShowUsageBar       bool   `env:"SHOW_USAGE_BAR" envDefault:"false"`
}

type ServerConfig struct {
	Host  string `env:"SERVER_HOST" envDefault:"localhost" flag:"host"`
	Port  string `env:"SERVER_PORT" envDefault:"3000" flag:"port"`
	Debug bool   `env:"SERVER_DEBUG" envDefault:"false" flag:"debug"`
}

type ScraperConfig struct {
	SyncInterval            time.Duration `env:"SCRAPER_SYNC_INTERVAL" envDefault:"1h" flag:"sync-interval"`
	Workers                 int           `env:"SCRAPER_WORKERS" envDefault:"20" flag:"workers"`
	MaxPerRegistry          int           `env:"SCRAPER_MAX_PER_REGISTRY" envDefault:"0" flag:"max-per-registry"`
	ShowProgress            bool          `env:"SCRAPER_SHOW_PROGRESS" envDefault:"false" flag:"show-progress"`
	Debug                   bool          `env:"SCRAPER_DEBUG" envDefault:"false" flag:"scraper-debug"`
	CircuitBreakerThreshold int           `env:"SCRAPER_CIRCUIT_BREAKER_THRESHOLD" envDefault:"5" flag:"circuit-breaker-threshold"`
	HttpMaxRetries          int           `env:"SCRAPER_HTTP_MAX_RETRIES" envDefault:"2" flag:"http-max-retries"`
}

type DatabaseConfig struct {
	Connection string `env:"DATABASE_CONNECTION" envDefault:"sqlite" flag:"database-connection"`
	URL        string `env:"DATABASE_URL" envDefault:"data/ui.db" flag:"database-url"`
	ShowSQL    bool   `env:"DATABASE_SHOW_SQL" envDefault:"false" flag:"show-sql"`
}

func LoadConfig(flags *pflag.FlagSet) (*Config, error) {
	if err := godotenv.Load(); err != nil {
		clog.Debug("No .env file loaded", "error", err)
	}
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse env: %w", err)
	}
	if flags != nil {
		if err := applyFlagOverrides(flags, cfg); err != nil {
			return nil, err
		}
	}
	if err := setLogLevel(cfg); err != nil {
		return nil, err
	}
	if err := cfg.OIDC.Validate(); err != nil {
		return nil, err
	}
	if cfg.OIDC.Enabled() && cfg.SessionSecret == "" {
		return nil, errors.New("SESSION_SECRET is required when OIDC is enabled")
	}
	cfg.RegistryList = registry.LoadConfigsFallback()
	return cfg, nil
}

func setLogLevel(cfg *Config) error {
	level, err := clog.ParseLevel(cfg.App.VerboseLevel)
	if err != nil {
		return fmt.Errorf("invalid verbose level %q: %w", cfg.App.VerboseLevel, err)
	}
	if cfg.App.VerboseCount > 0 {
		levels := []string{logLevelWarn, logLevelInfo, logLevelDebug}
		idx := min(cfg.App.VerboseCount, len(levels)-1)
		flagLevel, err := clog.ParseLevel(levels[idx])
		if err != nil {
			return fmt.Errorf("invalid verbose level %q: %w", levels[idx], err)
		}
		if flagLevel < level {
			cfg.App.VerboseLevel = levels[idx]
			level = flagLevel
		}
	}
	clog.SetLevel(level)
	return nil
}

func applyFlagOverrides(flags *pflag.FlagSet, cfg *Config) error {
	if err := applyCountFlag(flags, "verbose", &cfg.App.VerboseCount); err != nil {
		return err
	}
	if err := applyBoolFlag(flags, flagDebug, &cfg.App.Debug); err != nil {
		return err
	}
	if err := applyBoolFlag(flags, flagDebug, &cfg.Server.Debug); err != nil {
		return err
	}
	if err := applyStringFlag(flags, "host", &cfg.Server.Host); err != nil {
		return err
	}
	if err := applyStringFlag(flags, "port", &cfg.Server.Port); err != nil {
		return err
	}
	if err := applyIntFlag(flags, "workers", &cfg.Scraper.Workers); err != nil {
		return err
	}
	if err := applyIntFlag(flags, "max-per-registry", &cfg.Scraper.MaxPerRegistry); err != nil {
		return err
	}
	if err := applyBoolFlag(flags, "show-progress", &cfg.Scraper.ShowProgress); err != nil {
		return err
	}
	if err := applyDurationFlag(flags, "sync-interval", &cfg.Scraper.SyncInterval); err != nil {
		return err
	}
	if err := applyStringFlag(flags, "database-url", &cfg.Database.URL); err != nil {
		return err
	}
	if err := applyBoolFlag(flags, "show-sql", &cfg.Database.ShowSQL); err != nil {
		return err
	}

	return nil
}

func applyStringFlag(flags *pflag.FlagSet, name string, target *string) error {
	if !flags.Changed(name) {
		return nil
	}

	value, err := flags.GetString(name)
	if err != nil {
		return fmt.Errorf("get string flag %s: %w", name, err)
	}
	*target = value
	return nil
}

func applyBoolFlag(flags *pflag.FlagSet, name string, target *bool) error {
	if !flags.Changed(name) {
		return nil
	}

	value, err := flags.GetBool(name)
	if err != nil {
		return fmt.Errorf("get bool flag %s: %w", name, err)
	}
	*target = value
	return nil
}

func applyIntFlag(flags *pflag.FlagSet, name string, target *int) error {
	if !flags.Changed(name) {
		return nil
	}

	value, err := flags.GetInt(name)
	if err != nil {
		return fmt.Errorf("get int flag %s: %w", name, err)
	}
	*target = value
	return nil
}

func applyCountFlag(flags *pflag.FlagSet, name string, target *int) error {
	if !flags.Changed(name) {
		return nil
	}

	value, err := flags.GetCount(name)
	if err != nil {
		return fmt.Errorf("get count flag %s: %w", name, err)
	}
	*target = value
	return nil
}

func applyDurationFlag(flags *pflag.FlagSet, name string, target *time.Duration) error {
	if !flags.Changed(name) {
		return nil
	}

	value, err := flags.GetDuration(name)
	if err != nil {
		return fmt.Errorf("get duration flag %s: %w", name, err)
	}
	*target = value
	return nil
}
