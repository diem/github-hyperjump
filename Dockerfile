FROM node:17

WORKDIR /app/hyperjump/

COPY ./package*.json ./

RUN npm install
COPY . ./

EXPOSE 3000

ENV APP_ID=
ENV PRIVATE_KEY=
ENV WEBHOOK_SECRET=

ENTRYPOINT [ "npm", "start" ]
