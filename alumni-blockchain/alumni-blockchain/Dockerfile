FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy the entire ALUMNI Node source code
# Since we have ZERO external dependencies, we don't even need npm install!
COPY . .

# Expose the HTTP API and P2P ports
EXPOSE 3001
EXPOSE 6001

# Start the ALUMNI node
CMD ["node", "start-node.mjs"]
