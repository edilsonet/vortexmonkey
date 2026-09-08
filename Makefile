.PHONY: help install dev up down migrate seed test typecheck

help:
	@echo "VORTEX Fase 1+2"
	@echo "  make up        Sobe PostgreSQL Redis RabbitMQ MinIO"
	@echo "  make migrate   Aplica migracoes SQL"
	@echo "  make seed      Semente de desenvolvimento"
	@echo "  make test      Testes unitarios"
	@echo "  make dev       API + web"

install:
	pnpm install

dev:
	pnpm dev

up:
	docker compose up -d

down:
	docker compose down

migrate:
	pnpm db:migrate

seed:
	pnpm db:seed

test:
	pnpm test

typecheck:
	pnpm typecheck
