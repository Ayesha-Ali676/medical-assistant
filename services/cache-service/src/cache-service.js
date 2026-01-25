/**
 * Intelligent Caching Service
 * Redis-based caching for frequently accessed clinical data
 * Requirements: 6.4
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.accessCounts = new Map();
    this.lastAccessed = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.ttlDefaults = this.initializeTTLDefaults();
  }

  /**
   * Initialize default TTL values for different data types
   */
  initializeTTLDefaults() {
    return {
      patientData: 300, // 5 minutes
      labResults: 600, // 10 minutes
      medications: 1800, // 30 minutes
      vitals: 60, // 1 minute (real-time data)
      clinicalNotes: 3600, // 1 hour
      riskScores: 300, // 5 minutes
      alerts: 30, // 30 seconds
    };
  }

  /**
   * Generate cache key
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   * @returns {string} - Cache key
   */
  generateKey(type, id) {
    return `${type}:${id}`;
  }

  /**
   * Set cache entry
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(type, id, data, ttl = null) {
    const key = this.generateKey(type, id);
    const expiresAt = Date.now() + (ttl || this.ttlDefaults[type] || 300) * 1000;

    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
    });

    this.accessCounts.set(key, 0);
    this.lastAccessed.set(key, Date.now());
  }

  /**
   * Get cache entry
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   * @returns {*} - Cached data or null
   */
  get(type, id) {
    const key = this.generateKey(type, id);
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    // Update access tracking
    this.cacheHits++;
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
    this.lastAccessed.set(key, Date.now());

    return entry.data;
  }

  /**
   * Delete cache entry
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   */
  delete(type, id) {
    const key = this.generateKey(type, id);
    this.cache.delete(key);
    this.accessCounts.delete(key);
    this.lastAccessed.delete(key);
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match (e.g., 'patientData:*')
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessCounts.delete(key);
      this.lastAccessed.delete(key);
    });

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
    };
  }

  /**
   * Get frequently accessed items
   * @param {number} limit - Number of items to return
   * @returns {Array} - Most frequently accessed items
   */
  getFrequentlyAccessed(limit = 10) {
    const items = Array.from(this.accessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => ({
        key,
        accessCount: count,
        lastAccessed: this.lastAccessed.get(key),
      }));

    return items;
  }

  /**
   * Clean expired entries
   * @returns {number} - Number of entries cleaned
   */
  cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessCounts.delete(key);
      this.lastAccessed.delete(key);
    });

    return keysToDelete.length;
  }

  /**
   * Implement LRU eviction policy
   * @param {number} maxSize - Maximum cache size
   * @returns {number} - Number of entries evicted
   */
  evictLRU(maxSize) {
    if (this.cache.size <= maxSize) {
      return 0;
    }

    const entriesToEvict = this.cache.size - maxSize;
    const sortedByAccess = Array.from(this.lastAccessed.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, entriesToEvict);

    sortedByAccess.forEach(([key]) => {
      this.cache.delete(key);
      this.accessCounts.delete(key);
      this.lastAccessed.delete(key);
    });

    return entriesToEvict;
  }

  /**
   * Warm cache with frequently accessed data
   * @param {Array} dataItems - Items to pre-load
   */
  warmCache(dataItems) {
    dataItems.forEach(item => {
      this.set(item.type, item.id, item.data, item.ttl);
    });
  }

  /**
   * Get cache entry age
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   * @returns {number} - Age in milliseconds
   */
  getAge(type, id) {
    const key = this.generateKey(type, id);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    return Date.now() - entry.createdAt;
  }

  /**
   * Check if cache entry exists and is valid
   * @param {string} type - Data type
   * @param {string} id - Resource ID
   * @returns {boolean} - True if exists and valid
   */
  has(type, id) {
    const key = this.generateKey(type, id);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    return Date.now() <= entry.expiresAt;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessCounts.clear();
    this.lastAccessed.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache size in bytes (approximate)
   * @returns {number} - Approximate size in bytes
   */
  getSizeInBytes() {
    let size = 0;

    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.data).length;
    }

    return size;
  }

  /**
   * Optimize cache by removing least valuable entries
   * @param {number} targetSize - Target cache size
   * @returns {number} - Number of entries removed
   */
  optimize(targetSize) {
    if (this.cache.size <= targetSize) {
      return 0;
    }

    // Calculate value score for each entry (access frequency / age)
    const scores = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const accessCount = this.accessCounts.get(key) || 0;
      const age = now - entry.createdAt;
      const score = accessCount / (age / 1000); // accesses per second

      scores.push({ key, score });
    }

    // Sort by score (lowest first) and remove
    scores.sort((a, b) => a.score - b.score);
    const toRemove = scores.slice(0, this.cache.size - targetSize);

    toRemove.forEach(({ key }) => {
      this.cache.delete(key);
      this.accessCounts.delete(key);
      this.lastAccessed.delete(key);
    });

    return toRemove.length;
  }
}

module.exports = CacheService;
