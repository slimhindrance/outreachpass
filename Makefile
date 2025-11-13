.PHONY: help install dev test lint format build deploy clean

help: ## Show this help message
	@echo "OutreachPass Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies with Poetry
	./scripts/poetry_setup.sh

dev: ## Start development server
	./scripts/dev_server.sh

test: ## Run tests with coverage
	./scripts/test.sh

lint: ## Run linters (ruff, mypy)
	./scripts/lint.sh

format: ## Format code (black, ruff)
	./scripts/format.sh

build: ## Build Lambda deployment package
	./scripts/build_lambda.sh

deploy: ## Deploy infrastructure to AWS
	./scripts/deploy.sh dev

deploy-prod: ## Deploy to production
	./scripts/deploy.sh prod

migrate: ## Run database migrations
	./scripts/run_migrations.sh

seed: ## Seed database with initial data
	./scripts/seed_database.sh

clean: ## Clean build artifacts
	rm -rf build/
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf backend/app/__pycache__/
	rm -f terraform/modules/lambda/lambda.zip
	rm -rf terraform/modules/lambda/layers/

shell: ## Open Poetry shell
	poetry shell

update: ## Update dependencies
	poetry update

lock: ## Update poetry.lock
	poetry lock --no-update
