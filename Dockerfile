FROM node:18.20.2
WORKDIR /directus
RUN mkdir -p extensions

COPY package.json .
COPY extensions/ extensions/
COPY templates/ templates/
COPY .env .
RUN mkdir -p uploads

RUN npm install

EXPOSE 8055

CMD npx directus start
