.PHONY: help up down build restart logs ps shell-backend shell-frontend clean

help:
	@echo "MoreClient Project Management Commands:"
	@echo "  make up             - Start all services in detached mode"
	@echo "  make down           - Stop and remove all containers"
	@echo "  make build          - Build or rebuild services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make ps             - List running containers"
	@echo "  make shell-backend  - Access backend container shell"
	@echo "  make shell-frontend - Access frontend container shell"
	@echo "  make clean          - Remove unused docker images and volumes"

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

clean:
	docker docker system prune -f
	docker volume prune -f
