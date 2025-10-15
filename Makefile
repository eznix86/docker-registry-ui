# Makefile

DB_DRIVER := sqlite3
DB_PATH := database/database.db
MIGRATIONS_DIR := database/migrations

.DEFAULT_GOAL := help

# Allow 'make migrate <args>' to pass extra arguments to goose
ifeq (migrate,$(firstword $(MAKECMDGOALS)))
  RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(RUN_ARGS):;@:)
endif

help: ## Show this help message
	@echo ""
	@echo "Available make commands:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make migrate status"
	@echo "  make migrate create NAME sql"
	@echo "  make migrate init initial_schema"
	@echo "  make migrate up"
	@echo "  make migrate down"
	@echo ""

migrate: ## Run database migrations with goose
	@echo "Running migrations with goose..."
	goose -dir "$(MIGRATIONS_DIR)" "$(DB_DRIVER)" "$(DB_PATH)" $(RUN_ARGS)

lint: ## Run linting tools
	bun run lint

preview: ## Build project like a production build and preview
	bun run build:dev
	bun run preview

install: # Install dependencies
	go mod tidy
	bun install

dev: ## Run development server
	bunx concurrently 'air' 'bun run dev'


build: clean-build ## Build assets
	bun run build

clean-build: ## Clean build directory
	@rm -rf public/build

seed: ## Seed the database
	go run . seed

%:
	@:
