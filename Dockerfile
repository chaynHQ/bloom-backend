FROM node:12.14.1-alpine

ENV NODE_ENV=development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

EXPOSE 35001

CMD ["node", "dist/src/main"] 