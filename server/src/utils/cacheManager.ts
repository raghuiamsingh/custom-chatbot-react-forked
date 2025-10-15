import NodeCache from 'node-cache';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  checkperiod: number; // Check for expired keys every X seconds
  useClones: boolean; // Clone cached values
  maxKeys: number; // Maximum number of keys
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

class CacheManager {
  private cache: NodeCache;
  public defaultTtl: number;
  private stats: {
    hits: number;
    misses: number;
  };

  constructor(config: CacheConfig = {
    ttl: 300, // 5 minutes default
    checkperiod: 60, // Check every minute
    useClones: false,
    maxKeys: 1000
  }) {
    this.defaultTtl = config.ttl;
    this.cache = new NodeCache(config);
    this.stats = { hits: 0, misses: 0 };

    // Set up event listeners
    this.cache.on('set', (key, value) => {
      console.log(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      console.log(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      console.log(`Cache EXPIRED: ${key}`);
    });
  }

  /**
   * Generate cache key for BotDojo requests
   */
  private generateBotDojoKey(message: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const key = `botdojo:${Buffer.from(message + optionsStr).toString('base64')}`;
    return key.substring(0, 100); // Limit key length
  }

  /**
   * Generate cache key for suggestions
   */
  private generateSuggestionsKey(context: string, currentSetIndex: number): string {
    const key = `suggestions:${Buffer.from(context + currentSetIndex.toString()).toString('base64')}`;
    return key.substring(0, 100);
  }

  /**
   * Get cached BotDojo response
   */
  getBotDojoResponse(message: string, options?: any): any | undefined {
    const key = this.generateBotDojoKey(message, options);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`Cache HIT: ${key}`);
      return value;
    } else {
      this.stats.misses++;
      console.log(`Cache MISS: ${key}`);
      return undefined;
    }
  }

  /**
   * Set cached BotDojo response
   */
  setBotDojoResponse(message: string, response: any, options?: any, ttl?: number): void {
    const key = this.generateBotDojoKey(message, options);
    const success = this.cache.set(key, response, ttl || this.defaultTtl);
    
    if (success) {
      console.log(`Cache SET: ${key} (TTL: ${ttl || 'default'})`);
    } else {
      console.log(`Cache SET FAILED: ${key}`);
    }
  }

  /**
   * Get cached suggestions
   */
  getSuggestions(context: string, currentSetIndex: number): any | undefined {
    const key = this.generateSuggestionsKey(context, currentSetIndex);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`Cache HIT: ${key}`);
      return value;
    } else {
      this.stats.misses++;
      console.log(`Cache MISS: ${key}`);
      return undefined;
    }
  }

  /**
   * Set cached suggestions
   */
  setSuggestions(context: string, currentSetIndex: number, suggestions: any, ttl?: number): void {
    const key = this.generateSuggestionsKey(context, currentSetIndex);
    const success = this.cache.set(key, suggestions, ttl || this.defaultTtl);
    
    if (success) {
      console.log(`Cache SET: ${key} (TTL: ${ttl || 'default'})`);
    } else {
      console.log(`Cache SET FAILED: ${key}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const nodeStats = this.cache.getStats();
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;

    return {
      ...nodeStats,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0 };
    console.log('Cache cleared');
  }

  /**
   * Get cache keys (for debugging)
   */
  getKeys(): string[] {
    return this.cache.keys();
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.del(key) > 0;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key
   */
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Set TTL for a key
   */
  setTtl(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }

  /**
   * Close cache and cleanup
   */
  close(): void {
    this.cache.close();
    console.log('Cache closed');
  }
}

// Create singleton instance
export const cacheManager = new CacheManager({
  ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
  checkperiod: 60,
  useClones: false,
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10)
});

// Export types and class for testing
export { CacheManager };
