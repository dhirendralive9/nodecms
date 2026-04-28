FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
