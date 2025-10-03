# BotDojo Custom Chat

A modern React-based chat application built with Vite, TypeScript, and TailwindCSS. Features a ChatGPT-like interface with support for text messages, quick reply buttons, and rich card components.

## Features

- 🚀 **Modern Stack**: Built with React 18, TypeScript, and Vite
- 🎨 **Beautiful UI**: Styled with TailwindCSS for a clean, modern look
- 💬 **Chat Interface**: ChatGPT-like layout with scrollable messages
- 🔘 **Interactive Elements**: Support for quick reply buttons and rich cards
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Fast Development**: Hot module replacement with Vite
- 🛡️ **Type Safety**: Full TypeScript support for better development experience

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd botdojo-custom-chat
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Setup the backend server**
   ```bash
   cd server
   npm install
   ```

4. **Configure BotDojo API**
   
   The server is pre-configured with working BotDojo credentials. If you need to use different credentials, you can:
   
   - Set environment variables directly:
   ```bash
   export BOTDOJO_API_KEY="your-api-key-here"
   export BOTDOJO_BASE_URL="https://api.botdojo.com/api/v1"
   export BOTDOJO_ACCOUNT_ID="your-account-id"
   export BOTDOJO_PROJECT_ID="your-project-id"
   export BOTDOJO_FLOW_ID="your-flow-id"
   ```
   
   - Or modify the hardcoded values in `server/server.js`

5. **Start the backend server**
   ```bash
   cd server
   npm start
   ```

6. **Start the frontend development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173` to see the application.

## Usage

### Basic Chat

1. Type your message in the input field at the bottom
2. Press Enter or click Send to send the message
3. The message will be sent to the backend API endpoint `/chat`
4. Bot responses will appear in the chat window

### Message Types

The application supports three types of messages:

#### Text Messages
Simple text bubbles with different styling for user and assistant messages.

#### Button Groups
Quick reply buttons that users can click to send predefined responses:
```json
{
  "type": "buttons",
  "content": "Choose an option:",
  "buttons": [
    { "text": "Option 1", "value": "option1" },
    { "text": "Option 2", "value": "option2" }
  ]
}
```

#### Cards
Rich content cards with images, titles, and descriptions:
```json
{
  "type": "card",
  "content": "Here's a product recommendation:",
  "card": {
    "title": "Product Name",
    "description": "Product description",
    "image": "https://example.com/image.jpg"
  }
}
```

## API Integration

The application connects to a Node.js + Express server that integrates with the BotDojo API.

### Backend Server

The server (`server/server.js`) provides:

- **POST /chat**: Accepts user messages and forwards them to BotDojo API
- **GET /health**: Health check endpoint

### Request Format
```json
{
  "message": "User's message text"
}
```

### Response Format
```json
{
  "messages": [
    {
      "role": "bot",
      "type": "text|buttons|card|list",
      "content": "Response content"
    }
  ]
}
```

### BotDojo Integration

The server normalizes BotDojo API responses into the expected format. The application is pre-configured with working BotDojo credentials for a supplement recommendation flow.

**Current Configuration:**
- ✅ **API Key**: Pre-configured and working
- ✅ **Endpoint**: `https://api.botdojo.com/api/v1/accounts/{account_id}/projects/{project_id}/flows/{flow_id}/run`
- ✅ **Request Format**: `{body: {text_input: "user message"}}`
- ✅ **Response Handling**: Extracts text from BotDojo's complex response structure

**Environment Variables (if needed):**
- `BOTDOJO_API_KEY`: Your BotDojo API key
- `BOTDOJO_BASE_URL`: BotDojo API base URL (https://api.botdojo.com/api/v1)
- `BOTDOJO_ACCOUNT_ID`: Your BotDojo account ID
- `BOTDOJO_PROJECT_ID`: Your BotDojo project ID
- `BOTDOJO_FLOW_ID`: Your BotDojo flow ID
- `PORT`: Server port (default: 3001)

## Project Structure

```
├── src/                   # React frontend
│   ├── components/
│   │   ├── ChatWindow.tsx      # Main chat container
│   │   ├── MessageRenderer.tsx # Message type router
│   │   ├── MessageBubble.tsx   # Text message bubbles
│   │   ├── ButtonGroup.tsx     # Quick reply buttons
│   │   ├── Card.tsx           # Rich content cards
│   │   └── InputBar.tsx       # Message input field
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # TailwindCSS imports
├── server/                # Node.js backend
│   ├── server.js          # Express server with BotDojo integration
│   ├── package.json       # Server dependencies
│   └── README.md          # Server documentation
├── package.json           # Frontend dependencies
└── README.md              # This file
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Customization

### Styling
The application uses TailwindCSS for styling. You can customize the appearance by:

1. Modifying Tailwind classes in the components
2. Adding custom CSS in `src/index.css`
3. Extending the Tailwind configuration in `tailwind.config.js`

### Adding New Message Types

1. Define the new message type in `MessageRenderer.tsx`
2. Create a new component for rendering the message type
3. Add the rendering logic to `MessageRenderer.tsx`
4. Update the TypeScript interfaces as needed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.