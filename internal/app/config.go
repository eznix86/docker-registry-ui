package app

import (
	"fmt"
	"reflect"
	"time"

	"github.com/caarlos0/env/v11"
	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/joho/godotenv"
	"github.com/spf13/pflag"
)

type Config struct {
	App          AppConfig
	Server       ServerConfig
	Scraper      ScraperConfig
	Database     DatabaseConfig
	RegistryList []registry.Config
}

type AppConfig struct {
	VerboseLevel       string `env:"APP_VERBOSE_LEVEL" envDefault:"warn"`
	VerboseCount       int    `flag:"verbose"`
	Debug              bool   `env:"APP_DEBUG" envDefault:"false" flag:"debug"`
	DisableTagDeletion bool   `env:"DISABLE_TAG_DELETION" envDefault:"false"`
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
		applyFlagOverrides(flags, cfg)
	}
	if err := setLogLevel(cfg); err != nil {
		return nil, err
	}
	cfg.RegistryList = registry.LoadConfigsFallback()
	return cfg, nil
}

func setLogLevel(cfg *Config) error {
	if cfg.App.VerboseCount > 0 {
		levels := []string{"warn", "info", "debug"}
		idx := cfg.App.VerboseCount
		if idx >= len(levels) {
			idx = len(levels) - 1
		}
		cfg.App.VerboseLevel = levels[idx]
	}
	level, err := clog.ParseLevel(cfg.App.VerboseLevel)
	if err != nil {
		return fmt.Errorf("invalid verbose level %q: %w", cfg.App.VerboseLevel, err)
	}
	clog.SetLevel(level)
	return nil
}

func applyFlagOverrides(flags *pflag.FlagSet, cfg *Config) {
	v := reflect.ValueOf(cfg).Elem()
	applyFlagsToStruct(v, flags)
}

func applyFlagsToStruct(v reflect.Value, flags *pflag.FlagSet) {
	t := v.Type()
	for i := range v.NumField() {
		field := v.Field(i)
		ft := t.Field(i)
		if !field.CanSet() {
			continue
		}
		if field.Kind() == reflect.Struct {
			applyFlagsToStruct(field, flags)
			continue
		}
		flagName := ft.Tag.Get("flag")
		if flagName == "" || !flags.Changed(flagName) {
			continue
		}
		setFieldFromFlag(field, flags, flagName)
	}
}

func setFieldFromFlag(field reflect.Value, flags *pflag.FlagSet, name string) {
	switch field.Kind() {
	case reflect.String:
		if v, err := flags.GetString(name); err == nil {
			field.SetString(v)
		}
	case reflect.Bool:
		if v, err := flags.GetBool(name); err == nil {
			field.SetBool(v)
		}
	case reflect.Int:
		if v, err := flags.GetCount(name); err == nil {
			field.SetInt(int64(v))
		} else if v, err := flags.GetInt(name); err == nil {
			field.SetInt(int64(v))
		}
	case reflect.Int64:
		if field.Type() == reflect.TypeOf(time.Duration(0)) {
			if v, err := flags.GetDuration(name); err == nil {
				field.SetInt(int64(v))
			}
		} else {
			if v, err := flags.GetInt64(name); err == nil {
				field.SetInt(v)
			}
		}
	}
}
