.PHONY: help install build typecheck lint test e2e verify serve web infra-up up down logs migrate seed ledger-key bootstrap-admin api-up prod-up prod-down prod-bootstrap prod-bootstrap-check backup restore

DOCKER_COMPOSE ?= docker compose
DB_HOST ?= 127.0.0.1
DB_PORT ?= 5432
DB_NAME ?= vortex
DB_ADMIN_USER ?= vortex_admin
DB_ADMIN_PASSWORD ?= dev-admin-password
DB_APP_USER ?= vortex_app
DB_APP_PASSWORD ?= dev-app-password

export DB_HOST DB_PORT DB_NAME DB_ADMIN_USER DB_ADMIN_PASSWORD DB_APP_USER DB_APP_PASSWORD

help: ## Lista os comandos disponiveis
	@echo "VORTEX v4 — comandos:"
	@echo "  make install     Instala dependencias (pnpm, workspace Nx)"
	@echo "  make build       Compila todos os projetos"
	@echo "  make typecheck   Verifica tipos"
	@echo "  make lint        Executa ESLint"
	@echo "  make test        Testes unitarios"
	@echo "  make e2e         Testes end-to-end do ops-mro"
	@echo "  make verify      typecheck + lint + test + build"
	@echo "  make serve       Sobe a API ops-mro em modo dev (porta 3400)"
	@echo "  make web         Sobe o host federado shell-web em modo dev (porta 4300)"
	@echo "  make infra-up    Sobe PostgreSQL/Redis/RabbitMQ/MinIO"
	@echo "  make up          Sobe infra + API em containers (--build)"
	@echo "  make down        Derruba os containers"
	@echo "  make logs        Acompanha os logs dos containers"
	@echo "  make migrate     Aplica migracoes SQL"
	@echo "  make seed        Aplica o seed de desenvolvimento"
	@echo "  make bootstrap-admin  Cria o administrador de producao (via .env)"
	@echo "  make ledger-key  Gera o par Ed25519 do ledger em .secrets/"
	@echo "  make prod-up     Sobe producao (docker-compose.prod.yml)"
	@echo "  make prod-down   Derruba producao"
	@echo "  make prod-bootstrap  Bootstrap de admin no container de producao"
	@echo "  make prod-bootstrap-check  Valida ADMIN_*/TENANT_*/COMPANY_* sem gravar"
	@echo "  make backup      Backup PostgreSQL + MinIO"
	@echo "  make restore FILE=...  Restauracao"

install:
	pnpm install

build:
	pnpm nx run-many -t build

typecheck:
	pnpm nx run-many -t typecheck

lint:
	pnpm nx run-many -t lint

test:
	pnpm nx run-many -t test

e2e:
	pnpm nx e2e ops-mro-e2e

verify:
	pnpm nx run-many -t typecheck lint test build

serve:
	pnpm nx serve ops-mro

web:
	pnpm nx serve shell-web

infra-up:
	$(DOCKER_COMPOSE) up -d postgres redis rabbitmq minio

up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

migrate:
	node tools/migrate.mjs

seed:
	node tools/seed-dev.mjs

bootstrap-admin:
	node tools/bootstrap-admin.mjs

ledger-key:
	node tools/gen-ledger-key.mjs

api-up:
	$(DOCKER_COMPOSE) up -d --build api

prod-up:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d --build

prod-down:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml down

prod-bootstrap:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml exec api node /app/tools/bootstrap-admin.mjs

prod-bootstrap-check:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml exec api node /app/tools/bootstrap-admin.mjs --check

backup:
	bash backup.sh

restore:
	@test -n "$(FILE)" || (echo "Uso: make restore FILE=backups/vortex_backup_YYYYmmdd_HHMMSS.tar.gz"; exit 1)
	bash restore.sh "$(FILE)"
