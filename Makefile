.DEFAULT_GOAL := shell

test:
	npx vitest run

down:
	docker compose down

ff_clean_docker:
	$$(docker stop $(docker ps -aq) | true)
	$$(docker rm $(docker ps -aq) | true)
	$$(docker rmi $(docker images -q) | true)
	$$(docker volume rm $(docker volume ls -q) | true)
	$$(docker network rm $(docker network ls -q) | true)
	docker system prune -a --volumes --force


dev_fabi:
	docker compose build dev_fabi\
		--build-arg UID=$(shell id -u) \
		--build-arg GID=$(shell id -g) \
		--build-arg USERNAME=$(shell id -un) \
	&& docker compose up -d dev_fabi \
	&& docker exec -it dev_fabi bash

build_man:
	docker build -f Dockerfile.dev -t ft-transcendence-dev .

run_man:
	docker run --rm -it \
		-v "$(PWD)":/app \
		-w /app \
		-p 3000:3000 \
		ft-transcendence-dev

stop_man:
	docker stop $(docker ps -q)

del_images_man: stop
	docker rmi -f $(docker images -q)




#izane Part

# Compose PArt
build:
	docker-compose build app

up: build
	docker-compose up app

up-detach: build
	docker-compose up -d

# docker run -it --rm --entrypoint sh node:22-alpine
shell: build
	docker-compose run --rm --service-ports app sh

# down:
# 	docker-compose down

clean:
	docker-compose down --rmi all --volumes --remove-orphans

restart: down up

re: clean shell

ps:
	docker-compose ps

logs:
	docker-compose logs -f

run_izi:
	npm run dev

.PHONY: \
	build \
	up \
	up-detach \
	shell \
	down \
	clean \
	restart \
	ps \
	re \
	all \
	ff_clean_docker \
	dev_fabi \
	run_izi \
	logs
