# Custom Chatbot React Application

A modern, full-stack chatbot application built with React, TypeScript, and Node.js that integrates with BotDojo for supplement discovery and health recommendations.

## 🚀 Features

### Core Functionality
- **Real-time Chat**: Interactive conversation with AI assistant
- **Product Recommendations**: Structured product suggestions with images and descriptions
- **Suggested Questions**: Dynamic follow-up questions based on context
- **Structured Content**: Support for guides, FAQs, lab results, images, and link lists
- **Sidebar Navigation**: Detailed view of recommendations and structured content

### Technical Features
- **TypeScript**: Full type safety across frontend and backend
- **Modular Architecture**: Clean separation of concerns with services, utilities, and components
- **Error Handling**: Comprehensive error boundaries and logging
- **Input Validation**: Sanitization and validation for all user inputs
- **Caching**: Intelligent caching of BotDojo responses for improved performance
- **Rate Limiting**: Protection against abuse and excessive requests
- **Security**: Helmet.js security headers and CORS configuration
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Testing**: Unit tests for critical functions and API endpoints
- **API Documentation**: OpenAPI/Swagger specification

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/          # Reusable UI components
├── contexts/            # React Context for state management
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main application component
```

### Backend (Node.js + TypeScript)
```
server/
├── src/
│   ├── config/         # Environment and configuration
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── app.ts          # Express application setup
├── docs/               # API documentation
└── dist/               # Compiled JavaScript
```

## 🛠️ Setup and Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- BotDojo API credentials

### Environment Variables
Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Cache Configuration
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# Media Configuration
MEDIA_BASE=https://uat.gethealthy.store
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd custom-chatbot-react
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   cd server
   npm run dev
   ```

## 🚀 Development

### Frontend Development
```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

### Backend Development
```bash
cd server

# Start development server with TypeScript
npm run dev

# Build TypeScript
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

The API is fully documented with OpenAPI/Swagger specification available at:
- **Development**: `http://localhost:3001/docs` (if Swagger UI is configured)
- **Specification**: `server/docs/openapi.yaml`

### Key Endpoints

- `POST /chat` - Send messages to the chatbot
- `POST /suggestions` - Get suggested follow-up questions
- `POST /debug-botdojo` - Debug BotDojo API responses
- `POST /test-structured` - Test structured content types
- `GET /health` - Health check with cache statistics
- `GET /cache/stats` - Cache performance metrics
- `POST /cache/clear` - Clear all cached data

## 🧪 Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
cd server
npm test
npm run test:coverage
```

### Test Coverage
The application includes comprehensive test coverage for:
- BotDojo service integration
- Canvas data parsing
- Media utilities
- Error handling
- Input validation

## 🔧 Configuration

### Cache Settings
- **TTL**: 5 minutes (300 seconds) for BotDojo responses
- **Max Keys**: 1000 cached items
- **Hit Rate**: Monitor via `/cache/stats` endpoint

### Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Endpoints**: `/chat`, `/suggestions`

### Security Features
- **Helmet.js**: Security headers
- **CORS**: Configurable origins
- **Input Validation**: All inputs sanitized
- **Error Handling**: No sensitive data exposure

## 🎨 UI/UX Features

### Accessibility
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus indicators
- **Color Contrast**: WCAG compliant colors

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Dark Mode**: Toggle between light and dark themes
- **Flexible Layout**: Adapts to different screen sizes

### User Experience
- **Typing Indicators**: Visual feedback during responses
- **Message History**: Persistent conversation state
- **Error Recovery**: Graceful error handling
- **Loading States**: Clear loading indicators

## 📊 Monitoring and Logging

### Logging
- **Winston**: Structured logging with multiple transports
- **Request Tracking**: Unique request IDs for debugging
- **Performance Metrics**: Response time monitoring
- **Error Tracking**: Comprehensive error logging

### Health Checks
- **Dependency Validation**: BotDojo API connectivity
- **Cache Statistics**: Performance metrics
- **Memory Usage**: Resource monitoring

## 🔄 State Management

### Frontend State
- **React Context**: Centralized state management
- **Reducer Pattern**: Predictable state updates
- **Type Safety**: Full TypeScript integration

### Backend State
- **Stateless Design**: No server-side session storage
- **Cache Layer**: Redis-like in-memory caching
- **Configuration**: Environment-based settings

## 🚀 Deployment

### Production Build
```bash
# Frontend
npm run build

# Backend
cd server
npm run build
npm run start
```

### Docker Support
```dockerfile
# Use the provided Dockerfile
docker build -t chatbot-app .
docker run -p 3001:3001 chatbot-app
```

### Environment Variables
Ensure all required environment variables are set in production:
- BotDojo API credentials
- CORS origins
- Cache settings
- Logging configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Testing**: Unit tests for new features

## 📝 Changelog

### Version 1.0.0
- ✅ Modular server architecture
- ✅ TypeScript integration
- ✅ Comprehensive error handling
- ✅ Input validation and sanitization
- ✅ Unit testing framework
- ✅ Response caching
- ✅ Rate limiting
- ✅ Context API state management
- ✅ OpenAPI documentation
- ✅ Accessibility improvements
- ✅ Performance optimizations

## 🐛 Troubleshooting

### Common Issues

1. **BotDojo API Errors**
   - Verify API credentials are provided in request body as initData field (encrypted or plain JSON)
   - Check network connectivity
   - Review API rate limits
   - Ensure all required fields (BOTDOJO_API_KEY, BOTDOJO_BASE_URL, BOTDOJO_ACCOUNT_ID, BOTDOJO_PROJECT_ID, BOTDOJO_FLOW_ID) are included

2. **Cache Issues**
   - Clear cache via `/cache/clear` endpoint
   - Monitor cache statistics
   - Adjust TTL settings if needed

3. **Build Errors**
   - Ensure Node.js version 18+
   - Clear node_modules and reinstall
   - Check TypeScript configuration

### Debug Mode
Enable debug mode in the UI settings to see:
- Raw BotDojo API responses
- Request/response details
- Cache hit/miss information

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- BotDojo for AI integration
- React and TypeScript communities
- Express.js and Node.js ecosystems
- Open source contributors