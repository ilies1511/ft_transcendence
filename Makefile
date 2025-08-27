.DEFAULT_GOAL := eval
# .DEFAULT_GOAL := shell

# BEGIN -- DEV

dev: shell

build:
	docker compose build app_dev

up: build
	docker compose up app_dev

up-detach: build
	docker compose up -d app_dev

shell: build
	docker compose run --rm --service-ports app_dev sh

clean:
	docker compose down --rmi all --volumes --remove-orphans

restart: down up

re: ff_clean_docker shell


kill_node:
	kill -9 $(pidof node)

run: game_shared
	npm run dev

i:
	npm i

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


dev_maksim:
	docker compose down dev_maksim || true
	docker compose up --build -d dev_maksim
	docker exec -it dev_maksim bash

dev_fabi:
	docker compose build dev_fabi \
		--build-arg UID=$(shell id -u) \
		--build-arg GID=$(shell id -g) \
		--build-arg USERNAME=$(shell id -un) \
	&& docker compose up -d dev_fabi \
	&& docker exec -it dev_fabi bash



game_shared:
	rm -rf client/game/shared_game
	cp -r game_shared client/game


#dev_fabi:
#	docker compose build --build-arg UID=$(id -u) --build-arg GID=$(id -g) \
#		&& docker compose up dev_fabi -d \
#		&& docker exec -it dev_fabi bas
#
#

# END -- DEV


# BEGIN -- PROD
init:
	cd core && make && cd ../ make eval

eval: prod-build prod-up prod-logs
# eval: prod-build prod-up

prod-re: prod-down eval

prod-build:
	docker compose build app edge

prod-up: prod-build
	docker compose up -d app edge

prod-down:
	docker compose down

prod-logs:
	docker compose logs -f edge app
# END -- PROD

.PHONY: all \
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
	logs \
	dev_fabi \
	game_shared \
	i \
	prod-build \
	prod-up \
	prod-down \
	prod-logs \
	eval \
	init \
	run
