.DEFAULT_GOAL = build

build:
	docker build -f Dockerfile.dev -t ft-transcendence-dev .

run:
	docker run --rm -it \
		-v "$(PWD)":/app \
		-w /app \
		-p 3000:3000 \
		ft-transcendence-dev

.PHONY: clean build run
