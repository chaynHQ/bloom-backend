FROM node:12.14.1-alpine

ENV NODE_ENV=development

WORKDIR /app

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

CMD ["yarn", "start:dev"]