.DEFAULT_GOAL := shell

build:
	docker-compose build app

up: build
	docker-compose up app

up-detach: build
	docker-compose up -d

shell: build
	docker-compose run --rm --service-ports app sh

clean:
	docker-compose down --rmi all --volumes --remove-orphans

restart: down up

re: ff_clean_docker shell

ps:
	docker-compose ps

logs:
	docker-compose logs -f

run_izi:
	npm run dev

ff_clean_docker:
	$$(docker stop $(docker ps -aq) | true)
	$$(docker rm $(docker ps -aq) | true)
	$$(docker rmi $(docker images -q) | true)
	$$(docker volume rm $(docker volume ls -q) | true)
	$$(docker network rm $(docker network ls -q) | true)
	docker system prune -a --volumes --force

yallah:
	npm run build && npm run start

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
