.PHONY: run game_shared clean_modules modules remodules

run2: modules game_shared

run: modules game_shared
	npm run dev

game_shared:
	rm -rf frontend/src/game/game_shared/
	rm -rf backend/src/game/game_shared/
	cp -r game_shared frontend/src/game/
	cp -r game_shared backend/src/game/
	echo '*' > frontend/src/game/game_shared/.gitignore
	echo '*' > backend/src/game/game_shared/.gitignore


clean_modules:
	rm -f 'package-lock.json'
	rm -f 'frontend/package-lock.json'
	rm -f 'backend/package-lock.json'
	rm -rf 'node_modules'
	rm -rf 'frontend/node_modules'
	rm -rf 'backend/node_modules'

node_modules:
	npm install

package-lock.json:
	npm install

frontend/node_modules:
	cd frontend && npm install

frontend/package-lock.json:
	cd frontend && npm install

backend/node_modules:
	cd backend && npm install

backend/package-lock.json:
	cd backend && npm install

modules: node_modules package-lock.json frontend/node_modules frontend/package-lock.json backend/node_modules backend/package-lock.json

remodules: clean_modules modules
