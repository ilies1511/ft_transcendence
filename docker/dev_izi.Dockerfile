FROM node:22-alpine

WORKDIR /app

# 1) package.json (und ggf. package-lock.json) kopieren
COPY package*.json ./

# 2) Dependencies IM IMAGE installieren (dazu zählt jetzt auch lodash)
RUN npm ci

RUN npm install -g ts-node typescript nodemon

# 3)buildtools for node-gyp
# RUN apk add --no-cache \
# 	python3 \
# 	make \
# 	g++
RUN apk add --no-cache \
	# python3 \
	make
	# g++

# RUN npm install -g mongosh

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sh"]
