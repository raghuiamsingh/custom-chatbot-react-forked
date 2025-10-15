import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation
const requiredEnvVars = [
  'BOTDOJO_API_KEY',
  'BOTDOJO_BASE_URL', 
  'BOTDOJO_ACCOUNT_ID',
  'BOTDOJO_PROJECT_ID',
  'BOTDOJO_FLOW_ID'
] as const;

export interface BotDojoConfig {
  apiKey: string;
  baseUrl: string;
  accountId: string;
  projectId: string;
  flowId: string;
  mediaBase: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
}

export const validateEnvironment = (): void => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set all required BotDojo environment variables');
    process.exit(1);
  }
  
  console.log('✅ BotDojo API credentials loaded successfully');
};

// BotDojo configuration
export const botdojoConfig: BotDojoConfig = {
  apiKey: process.env.BOTDOJO_API_KEY!,
  baseUrl: process.env.BOTDOJO_BASE_URL!,
  accountId: process.env.BOTDOJO_ACCOUNT_ID!,
  projectId: process.env.BOTDOJO_PROJECT_ID!,
  flowId: process.env.BOTDOJO_FLOW_ID!,
  mediaBase: process.env.MEDIA_BASE || 'https://uat.gethealthy.store'
};

// Server configuration
export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://chatbot-demo-alb-895393060.us-east-1.elb.amazonaws.com']
};
