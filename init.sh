#!/bin/sh

cd core || exit 1

if [ -f package.json ] && [ -f package-lock.json ]; then
	echo "Dependencies cached"
	# echo "Installing dependencies..."
	# npm ci
else
	echo "package.json or package-lock.json missing. Set-Up with npm init -y ..."
	npm init -y
	# npm install fastify --save-exact
fi

exec bash
