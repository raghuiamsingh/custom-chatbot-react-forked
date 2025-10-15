import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, context?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 400, true, context);
    this.name = 'ValidationError';
  }
}

export class BotDojoError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 502, true, context);
    this.name = 'BotDojoError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: any) {
    super(message, 429, true, context);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: any) {
    super(message, 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: any) {
    super(message, 404, true, context);
    this.name = 'NotFoundError';
  }
}

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const context = {
    requestId,
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  // Log the error
  if (error instanceof AppError) {
    logger.error(`App Error: ${error.message}`, {
      ...context,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      stack: error.stack
    });
  } else {
    logger.error(`Unexpected Error: ${error.message}`, {
      ...context,
      stack: error.stack
    });
  }

  // Send error response
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        context: error.context 
      })
    });
  } else {
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      statusCode: 500,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string;
  
  logger.http(`${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentLength: req.get('Content-Length')
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};

// Input validation helpers
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
};

export const validateString = (value: any, fieldName: string, maxLength?: number): void => {
  validateRequired(value, fieldName);
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  if (maxLength && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters`);
  }
};

export const validateArray = (value: any, fieldName: string): void => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
};

export const validateNumber = (value: any, fieldName: string, min?: number, max?: number): void => {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be no more than ${max}`);
  }
};

export const validateEnum = (value: any, fieldName: string, allowedValues: any[]): void => {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

// Sanitization helpers
export const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, '');
};

export const sanitizeHtml = (value: string): string => {
  return value.replace(/<[^>]*>/g, '');
};

// Performance monitoring
export const performanceMonitor = (operation: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const requestId = args[0]?.headers?.['x-request-id'] || 'unknown';
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        
        logger.performance(operation, duration, { requestId });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        logger.performance(`${operation}_error`, duration, { 
          requestId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
};
