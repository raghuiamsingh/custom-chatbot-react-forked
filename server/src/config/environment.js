const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from root directory .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// BotDojo configuration
const botdojoConfig = {
  apiKey: process.env.BOTDOJO_API_KEY,
  baseUrl: process.env.BOTDOJO_BASE_URL,
  accountId: process.env.BOTDOJO_ACCOUNT_ID,
  projectId: process.env.BOTDOJO_PROJECT_ID,
  flowId: process.env.BOTDOJO_FLOW_ID,
  mediaBase: process.env.MEDIA_BASE || "https://uat.gethealthy.store",
};

// Server configuration
const serverConfig = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://gethealthy.local:9190",
        "http://localhost:5005",
        "http://app.gethealthyscript.local:5005",
        "http://chatbot-demo-alb-895393060.us-east-1.elb.amazonaws.com",
      ],
};

module.exports = {
  botdojoConfig,
  serverConfig,
};
