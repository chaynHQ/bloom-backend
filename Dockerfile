FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build

EXPOSE 35001

CMD ["yarn", "start:dev"] 