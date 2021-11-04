FROM node:12 As builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build

FROM node:12-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/
COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/node_modules/ /app/node_modules/
COPY .env .

EXPOSE 3000

CMD ["node", "dist/main"]