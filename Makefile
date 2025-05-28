
all:

down:
	docker compose down

ff_clean_docker:
	$$(docker stop $(docker ps -aq) | true)
	$$(docker rm $(docker ps -aq) | true)
	$$(docker rmi $(docker images -q) | true)
	$$(docker volume rm $(docker volume ls -q) | true)
	$$(docker network rm $(docker network ls -q) | true)
	docker system prune -a --volumes


dev_fabi:
	docker compose build --build-arg UID=$(id -u) --build-arg GID=$(id -g) \
		&& docker compose up dev_fabi -d \
		&& docker exec -it dev_fabi bash

