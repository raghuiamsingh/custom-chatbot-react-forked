import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

class Logger {
  private logger: winston.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'chatbot-server' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File transport for errors
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      // Handle unhandled promise rejections
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });

    // Add HTTP request logging middleware
    if (isDevelopment) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  http(message: string, context?: LogContext): void {
    this.logger.http(message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  silly(message: string, context?: LogContext): void {
    this.logger.silly(message, context);
  }

  // BotDojo specific logging
  botdojoRequest(endpoint: string, requestBody: any, context?: LogContext): void {
    this.info('BotDojo API Request', {
      ...context,
      endpoint,
      requestBody: this.sanitizeRequestBody(requestBody)
    });
  }

  botdojoResponse(endpoint: string, response: any, context?: LogContext): void {
    this.info('BotDojo API Response', {
      ...context,
      endpoint,
      responseSize: JSON.stringify(response).length,
      hasSteps: !!response.steps,
      hasAiMessage: !!response.aiMessage,
      hasTextOutput: !!response.response?.text_output
    });
  }

  botdojoError(endpoint: string, error: Error, context?: LogContext): void {
    this.error('BotDojo API Error', {
      ...context,
      endpoint,
      error: error.message,
      stack: error.stack
    });
  }

  // Chat specific logging
  chatRequest(message: string, context?: LogContext): void {
    this.info('Chat Request', {
      ...context,
      messageLength: message.length,
      messagePreview: message.substring(0, 100)
    });
  }

  chatResponse(messages: any[], context?: LogContext): void {
    this.info('Chat Response', {
      ...context,
      messageCount: messages.length,
      hasStructuredContent: messages.some(m => m.structured),
      hasSuggestedQuestions: messages.some(m => m.suggestedQuestions)
    });
  }

  // Security logging
  securityViolation(type: string, details: any, context?: LogContext): void {
    this.warn('Security Violation', {
      ...context,
      violationType: type,
      details
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info('Performance Metric', {
      ...context,
      operation,
      duration,
      unit: 'ms'
    });
  }

  private sanitizeRequestBody(requestBody: any): any {
    // Remove sensitive data from request body for logging
    const sanitized = { ...requestBody };
    if (sanitized.body && sanitized.body.text_input) {
      sanitized.body.text_input = sanitized.body.text_input.substring(0, 100) + '...';
    }
    return sanitized;
  }
}

// Create singleton instance
export const logger = new Logger();

// Export types for use in other modules
export { Logger };
