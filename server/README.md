# Chat Server

Express.js server that handles chat requests and integrates with BotDojo API.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env file with your actual BotDojo credentials
   nano .env
   ```
   
   Or set environment variables directly:
   ```bash
   export BOTDOJO_API_KEY="your-api-key-here"
   export BOTDOJO_BASE_URL="https://api.botdojo.com/v1/flows"
   export BOTDOJO_FLOW_ID="your-flow-id-here"
   export PORT=3001
   ```

3. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### POST /chat
Accepts chat messages and forwards them to BotDojo API.

**Request:**
```json
{
  "message": "Hello, how are you?"
}
```

**Response:**
```json
{
  "messages": [
    {
      "role": "bot",
      "type": "text",
      "content": "Hello! I'm doing well, thank you for asking."
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `BOTDOJO_API_KEY`: Your BotDojo API key
- `BOTDOJO_ENDPOINT`: BotDojo API endpoint URL
- `PORT`: Server port (default: 3001)
