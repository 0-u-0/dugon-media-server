FROM node:carbon

RUN \
	set -x \
	&& apt-get update \
	&& apt-get install -y build-essential 

RUN mkdir -p /code
WORKDIR /code
COPY . /code

RUN npm install

CMD ["npm", "start"]

