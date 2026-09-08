.PHONY: help install dev build up down logs migrate migrate-down seed test test-e2e lint format ledger-verify prod-up prod-down backup restore

help: ## Lista os comandos disponíveis
	@echo "Comandos de Operação VORTEX:"
	@echo "  make install       Instala dependências (pnpm)"
	@echo "  make dev           Executa o ecossistema em modo desenvolvimento"
	@echo "  make build         Compila o monorepo (Turborepo)"
	@echo "  make up            Sobe a infraestrutura local (Docker Compose)"
	@echo "  make down          Derruba a infraestrutura local"
	@echo "  make logs          Acompanha os logs da infraestrutura"
	@echo "  make migrate       Aplica migrações SQL no PostgreSQL 16"
	@echo "  make migrate-down  Reverte a última migração"
	@echo "  make seed          Aplica sementes canônicas de regulamentos ANAC"
	@echo "  make test          Executa testes unitários e de integração"
	@echo "  make test-e2e      Executa testes end-to-end"
	@echo "  make lint          Executa lint (ESLint)"
	@echo "  make format        Formata código (Prettier)"
	@echo "  make ledger-verify Executa varredura de integridade do Ledger"
	@echo "  make prod-up       Sobe o ambiente de produção (VPS)"
	@echo "  make prod-down     Derruba o ambiente de produção"
	@echo "  make backup        Executa backup (PostgreSQL + MinIO)"
	@echo "  make restore       Executa restauração (uso: make restore FILE=arquivo.tar.gz)"

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	pnpm db:migrate

migrate-down:
	pnpm db:migrate:down

seed:
	pnpm db:seed

test:
	pnpm test

test-e2e:
	pnpm test:e2e

lint:
	pnpm lint

format:
	pnpm format

ledger-verify:
	pnpm ledger:verify

prod-up:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

backup:
	bash scripts/backup.sh

restore:
	@test -n "$(FILE)" || (echo "Uso: make restore FILE=arquivo.tar.gz"; exit 1)
	bash scripts/restore.sh "$(FILE)"