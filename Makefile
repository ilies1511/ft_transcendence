 .DEFAULT_GOAL := init
# .DEFAULT_GOAL := eval
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


# END -- DEV


# BEGIN -- PROD
init:
	cd core && make && \
	docker compose build app edge && \
	docker compose up -d app edge && \
	docker compose logs -f edge app

eval: prod-build prod-up prod-logs
# eval: prod-build prod-up

prod-re: prod-down eval

prod-build: update-env
	docker compose build app edge

prod-up: update-env prod-build
	docker compose up -d app edge

prod-down:
	docker compose down

prod-logs:
	docker compose logs -f edge app

.PHONY: update-env

OS := $(shell uname)

ifeq ($(OS),Darwin)
	PORT1 ?= 123
	PORT2 ?= 321
	HOSTNAME ?= $$(hostname)
	LOCAL_IP ?= $$(route -n get 1.1.1.1 2>/dev/null | awk '/ifaddr:/{print $$2; exit}')
else
	PORT1 ?= 8080
	PORT2 ?= 1443
	HOSTNAME ?= $$(hostname)
	LOCAL_IP ?= $$(ip route get 1.1.1.1 2>/dev/null | awk '/src/{for(i=1;i<=NF;i++) if ($$i=="src") {print $$(i+1); exit}}')
endif

define SED_INPLACE
if sed --version >/dev/null 2>&1; then sed -i "$1" "$2"; else sed -i '' "$1" "$2"; fi
endef

define UPDATE_KV
tmp=$$(mktemp); \
awk -v k="$(1)" -v v="$(2)" 'BEGIN{set=0} \
	$$0 ~ "^"k"=" {print k"="v; set=1; next} \
	{print} \
END{if(!set) print k"="v}' .env > $$tmp && mv $$tmp .env
endef

update-env:
	@touch .env
	@$(call UPDATE_KV,HOSTNAME,$(HOSTNAME))
	@$(call UPDATE_KV,LOCAL_IP,$(LOCAL_IP))
	@$(call UPDATE_KV,PORT1,$(PORT1))
	@$(call UPDATE_KV,PORT2,$(PORT2))
	@echo "Updated .env with HOSTNAME=$(HOSTNAME), LOCAL_IP=$(LOCAL_IP), PORT1=$(PORT1), PORT2=$(PORT2)"

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
	run  \
	update-env \
	init \
	run
