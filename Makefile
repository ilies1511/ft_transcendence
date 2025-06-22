
.PHONY: all down ff_clean_docker dev_fabi game_shared i run

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
	docker system prune -a --volumes


dev_maksim:
	docker compose build dev_maksim \
		--build-arg UID=$(shell id -u) \
		--build-arg GID=$(shell id -g) \
		--build-arg USERNAME=$(shell id -un) \
	&& docker compose up -d dev_maksim \
	&& docker exec -it dev_maksim bash

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

