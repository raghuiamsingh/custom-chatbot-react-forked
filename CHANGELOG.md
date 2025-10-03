# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with React + Vite + TypeScript
- TailwindCSS integration for styling
- Chat interface components:
  - ChatWindow: Full-height scrollable chat panel
  - MessageRenderer: Renders different message types (text, buttons, cards, list)
  - MessageBubble: Text message bubbles with user/bot styling
  - ButtonGroup: Quick reply buttons
  - Card: Card component with image, title, and description
  - InputBar: Sticky bottom input field with send functionality
- ChatGPT-like layout with full-height flex column design
- Message state management in App.tsx with unique ID generation
- API integration for sending messages to backend (/chat endpoint)
- Support for different message types: text, buttons, cards, and list
- List message type with bullet point rendering
- Auto-scroll to latest messages
- Loading states and error handling
- Responsive design for mobile and desktop
- Centralized TypeScript types in src/types.ts
- Node.js + Express backend server in server/ folder
- BotDojo API integration with response normalization
- POST /chat endpoint for handling user messages
- Support for multiple message responses from BotDojo
- Health check endpoint for server monitoring

### Technical Details
- Built with React 18 and TypeScript
- Styled with TailwindCSS
- Vite for fast development and building
- Component-based architecture
- Type-safe message interfaces
- Async/await for API calls
