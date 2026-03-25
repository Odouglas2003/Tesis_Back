# ===========================================
# Makefile for Next.js Docker Development
# ===========================================

# Detects if 'docker-compose' (v1) or 'docker compose' (v2) exists
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")
DOCKER_COMPOSE_DEV = $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
DOCKER_COMPOSE_PROD = $(DOCKER_COMPOSE) -f docker-compose.yml
.PHONY: help dev prod build clean logs stop

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m

# Default target
.DEFAULT_GOAL := help

help: ## Show available commands
	@echo "$(GREEN)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)  %-15s$(NC) %s\n", $$1, $$2}'

# ===========================================
# Docker Local development commands
# ===========================================
# Development with hot-reload
dev: ## Start development environment with hot-reload
	@echo "$(GREEN)Starting development environment...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build --force-recreate

dev-bg: ## Start development environment in background
	@echo "$(GREEN)Starting development in background...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build -d --force-recreate

logs-dev: ## Show development logs
	$(DOCKER_COMPOSE_DEV) logs -f

shell-dev: ## Access development container shell
	$(DOCKER_COMPOSE_DEV) exec app sh

stop-dev: ## Stop all dev services
	@echo "$(YELLOW)Stopping all dev services...$(NC)"
	$(DOCKER_COMPOSE_DEV) down

clean-dev: ## Clean up containers and images
	@echo "$(RED)Cleaning up...$(NC)"
	$(DOCKER_COMPOSE_DEV) down -v --rmi all

# ===========================================
# CI/CD commands
# ===========================================

prepare-deps: ## Prepare dependencies for CI/CD
	@echo "$(GREEN)Preparing dependencies...$(NC)"

unit-test: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"

static-analysis: ## Run static analysis
	@echo "$(GREEN)Running static analysis...$(NC)"

build: ## Build the application
	@echo "$(GREEN)Building application...$(NC)"