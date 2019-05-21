FROM node:10-alpine
WORKDIR /usr/src/build

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --production

FROM node:10-alpine
WORKDIR /usr/src/underdico

COPY --from=0 /usr/src/build/package.json .
COPY --from=0 /usr/src/build/dist ./dist
COPY --from=0 /usr/src/build/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "."]
