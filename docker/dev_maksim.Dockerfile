FROM node:22-alpine

RUN apk add --no-cache bash make

WORKDIR /app

COPY docker/maksim_dev_init.sh /usr/local/bin/maksim_dev_init.sh
RUN chmod +x /usr/local/bin/maksim_dev_init.sh

ENTRYPOINT ["maksim_dev_init.sh"]
