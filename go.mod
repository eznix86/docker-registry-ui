module github.com/eznix86/docker-registry-ui

go 1.25.2

require (
	github.com/brianvoe/gofakeit/v7 v7.8.0
	github.com/caarlos0/env/v6 v6.10.1
	github.com/go-chi/chi/v5 v5.2.3
	github.com/joho/godotenv v1.5.1
	github.com/pressly/goose/v3 v3.26.0
	github.com/romsar/gonertia/v2 v2.0.7
	github.com/spf13/cobra v1.10.1
	gorm.io/driver/sqlite v1.6.0
	gorm.io/gorm v1.31.0
)

require (
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/mattn/go-sqlite3 v1.14.32 // indirect
	github.com/mfridman/interpolate v0.0.2 // indirect
	github.com/sethvargo/go-retry v0.3.0 // indirect
	github.com/spf13/pflag v1.0.10 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/sync v0.17.0 // indirect
	golang.org/x/text v0.30.0 // indirect
)

replace github.com/romsar/gonertia/v2 => github.com/eznix86/gonertia/v2 v2.0.0-20251024164004-59f4719adec5
