FROM node:22-alpine

# Install git for devcontainers
RUN apk add --no-cache git

ENV NODE_ENV=development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build

EXPOSE 35001

CMD ["yarn", "start:dev"] 