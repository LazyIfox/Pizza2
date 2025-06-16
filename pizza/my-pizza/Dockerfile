FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
COPY . .

RUN npm install
RUN npm run build

FROM node:18

WORKDIR /app

RUN npm install -g vite

COPY --from=builder /app/dist ./dist

EXPOSE 5173
CMD ["vite", "preview", "--port", "5173", "--host"]