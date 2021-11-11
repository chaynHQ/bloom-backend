FROM node:12.14.1-alpine

ENV NODE_ENV=development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

EXPOSE 3000

CMD ["node", "dist/main"] 