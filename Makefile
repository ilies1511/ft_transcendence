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


.DEFAULT_GOAL := shell

# Compose PArt
build:
	docker-compose build

up: build
	docker-compose up

up-detach: build
	docker-compose up -d

# docker run -it --rm --entrypoint sh node:22-alpine
shell: build
	docker-compose run --rm --service-ports app sh

down:
	docker-compose down

clean:
	docker-compose down --rmi all --volumes --remove-orphans

restart: down up

re: clean shell

ps:
	docker-compose ps

logs:
	docker-compose logs -f

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
	logs
