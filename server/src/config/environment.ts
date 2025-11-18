import dotenv from "dotenv";
import path from "path";

// Get __dirname equivalent for CommonJS (available at runtime after compilation)
// TypeScript needs this declaration since we're using ES6 imports but compiling to CommonJS
declare const __dirname: string;

// Load environment variables from root directory .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export interface BotDojoConfig {
  apiKey?: string;
  baseUrl?: string;
  accountId?: string;
  projectId?: string;
  flowId?: string;
  mediaBase: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
}

// BotDojo configuration (for mediaBase only - credentials come from request body as initData field)
export const botdojoConfig: BotDojoConfig = {
  apiKey: process.env.BOTDOJO_API_KEY,
  baseUrl: process.env.BOTDOJO_BASE_URL,
  accountId: process.env.BOTDOJO_ACCOUNT_ID,
  projectId: process.env.BOTDOJO_PROJECT_ID,
  flowId: process.env.BOTDOJO_FLOW_ID,
  mediaBase: process.env.MEDIA_BASE || "https://uat.gethealthy.store",
};

// Server configuration
export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
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
