FROM node:12.14.1-alpine

WORKDIR /app

COPY package.json ./

COPY yarn.lock ./

COPY tsconfig*.json ./

RUN yarn

COPY . ./

RUN yarn pretypeorm

EXPOSE 3000

CMD ["yarn", "start:dev"]