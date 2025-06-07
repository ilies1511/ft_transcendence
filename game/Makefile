.PHONY: env backend frontend

game_port := "3333"

all: backend frontend

frontend: env
	cd game_frontend && npm run dev -- --host

backend: env
	cd game_backend && npm run dev

game_frontend/.env:
	echo -n 'VITE_IP=' >>game_frontend/.env && hostname -I >>game_frontend/.env
	echo  "VITE_GAME_PORT=$(game_port)" >>game_frontend/.env

game_backend/.env:
	touch game_backend/.env
#hostname -I >game_backend/.env

clean:
	rm -f game_frontend/.env game_backend/.env

env: game_frontend/.env game_frontend/.env


