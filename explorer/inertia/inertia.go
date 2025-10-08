package inertia

import (
	"io"
	"io/fs"
	"log"
	"log/slog"
	"net/http"
	"strings"

	"github.com/eznix86/docker-registry-ui/explorer"
	"github.com/eznix86/docker-registry-ui/explorer/inertia/internal/inertia"
	"github.com/eznix86/docker-registry-ui/ui"
	"github.com/romsar/gonertia/v2"
)

type renderer interface {
	Render(w http.ResponseWriter, r *http.Request, component string, props ...gonertia.Props) (err error)
}

func createMux(h *handler) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/details", h.Details)
	mux.HandleFunc("/", h.Explore)

	return mux
}

func New(logger *slog.Logger, exp explorer.Explorer) http.Handler {
	inertia, err := gonertia.NewFromBytes(ui.BuildHtml())
	if err != nil {
		panic(err)
	}

	inertia.ShareTemplateFunc("vite", ui.Manifest())
	inertia.ShareTemplateFunc("viteReactRefresh", func() string { return "" })

	h := &handler{
		logger:   logger,
		explorer: exp,
		i:        inertia,
		assets:   ui.Assets(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/details", h.Details)
	mux.HandleFunc("/assets/", h.Assets)
	mux.HandleFunc("/", h.Explore)

	return mux
}

func Dev(logger *slog.Logger, exp explorer.Explorer) http.Handler {
	in, err := gonertia.NewFromFile("ui/views/app.html")
	if err != nil {
		panic(err)
	}

	i, err := inertia.NewWithVite(in)
	if err != nil {
		log.Fatal(err)
	}

	h := &handler{
		logger:   logger,
		i:        i,
		explorer: exp,
	}

	mux := createMux(h)
	return mux
}

type handler struct {
	logger   *slog.Logger
	i        renderer
	explorer explorer.Explorer
	assets   fs.FS
}

func (h *handler) Explore(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	h.logger.Debug("Explore", slog.String("url", r.URL.String()))

	q := r.URL.Query()
	req := explorer.ExploreRequest{
		Architecture: q.Get("arch"),
		Query:        q.Get("q"),
		Tags:         []string{q.Get("tags")},
		Untagged:     false, //q.Get("untagged"), // TODO
	}

	res, err := h.explorer.Explore(ctx, req)
	if err != nil {
		h.logger.Error(err.Error())
	}

	err = h.i.Render(w, r, "Explore", toExploreResponse(res))
	if err != nil {
		h.logger.Error(err.Error())
	}
}

func (h *handler) Details(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("Details", slog.String("url", r.URL.String()))

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Details"))
}

func (h *handler) Assets(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("Assets", slog.String("url", r.URL.String()))
	if h.assets == nil {
		http.NotFound(w, r)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/assets/")
	file, err := h.assets.Open(path)
	if err != nil {
		h.logger.Error("failed to open asset", slog.String("path", path), slog.String("error", err.Error()))
		http.NotFound(w, r)
		return
	}

	contentType := "text/plain"
	if strings.HasSuffix(path, ".js") {
		contentType = "application/javascript"
	} else if strings.HasSuffix(path, ".css") {
		contentType = "text/css"
	} else if strings.HasSuffix(path, ".png") {
		contentType = "image/png"
	} else if strings.HasSuffix(path, ".svg") {
		contentType = "image/svg+xml"
	} else if strings.HasSuffix(path, ".woff2") {
		contentType = "font/woff2"
	}

	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)

	defer file.Close()
	io.Copy(w, file)
}
