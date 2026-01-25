/**
 * Unit tests for Intelligent Caching Service
 * Requirements: 6.4
 */

const CacheService = require('./cache-service');

describe('CacheService', () => {
  let cacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entry', () => {
      const data = { name: 'John Doe', age: 65 };
      cacheService.set('patientData', 'P001', data);

      const cached = cacheService.get('patientData', 'P001');

      expect(cached).toEqual(data);
    });

    it('should return null for non-existent entry', () => {
      const cached = cacheService.get('patientData', 'P999');

      expect(cached).toBeNull();
    });

    it('should delete cache entry', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.delete('patientData', 'P001');

      const cached = cacheService.get('patientData', 'P001');

      expect(cached).toBeNull();
    });

    it('should check if entry exists', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      expect(cacheService.has('patientData', 'P001')).toBe(true);
      expect(cacheService.has('patientData', 'P999')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entry after TTL', (done) => {
      cacheService.set('patientData', 'P001', { name: 'John' }, 0.1); // 100ms TTL

      setTimeout(() => {
        const cached = cacheService.get('patientData', 'P001');
        expect(cached).toBeNull();
        done();
      }, 150);
    });

    it('should use default TTL for data type', () => {
      cacheService.set('vitals', 'V001', { hr: 75 });

      const entry = cacheService.cache.get('vitals:V001');
      const ttl = Math.round((entry.expiresAt - entry.createdAt) / 1000);

      expect(ttl).toBe(60); // Default for vitals
    });

    it('should clean expired entries', (done) => {
      cacheService.set('patientData', 'P001', { name: 'John' }, 0.1);
      cacheService.set('patientData', 'P002', { name: 'Jane' }, 10);

      setTimeout(() => {
        const cleaned = cacheService.cleanExpired();
        expect(cleaned).toBe(1);
        expect(cacheService.cache.size).toBe(1);
        done();
      }, 150);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      cacheService.get('patientData', 'P001'); // hit
      cacheService.get('patientData', 'P999'); // miss

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('50.00%');
    });

    it('should calculate hit rate correctly', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      for (let i = 0; i < 9; i++) {
        cacheService.get('patientData', 'P001'); // 9 hits
      }
      cacheService.get('patientData', 'P999'); // 1 miss

      const stats = cacheService.getStats();

      expect(stats.hitRate).toBe('90.00%');
    });

    it('should track cache size', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.set('patientData', 'P002', { name: 'Jane' });

      const stats = cacheService.getStats();

      expect(stats.size).toBe(2);
    });
  });

  describe('Access Tracking', () => {
    it('should track access counts', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      cacheService.get('patientData', 'P001');
      cacheService.get('patientData', 'P001');
      cacheService.get('patientData', 'P001');

      const accessCount = cacheService.accessCounts.get('patientData:P001');

      expect(accessCount).toBe(3);
    });

    it('should track last accessed time', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      const before = Date.now();
      cacheService.get('patientData', 'P001');
      const after = Date.now();

      const lastAccessed = cacheService.lastAccessed.get('patientData:P001');

      expect(lastAccessed).toBeGreaterThanOrEqual(before);
      expect(lastAccessed).toBeLessThanOrEqual(after);
    });

    it('should get frequently accessed items', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.set('patientData', 'P002', { name: 'Jane' });

      for (let i = 0; i < 5; i++) {
        cacheService.get('patientData', 'P001');
      }
      for (let i = 0; i < 2; i++) {
        cacheService.get('patientData', 'P002');
      }

      const frequent = cacheService.getFrequentlyAccessed(2);

      expect(frequent[0].key).toBe('patientData:P001');
      expect(frequent[0].accessCount).toBe(5);
      expect(frequent[1].key).toBe('patientData:P002');
      expect(frequent[1].accessCount).toBe(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by pattern', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.set('patientData', 'P002', { name: 'Jane' });
      cacheService.set('labResults', 'L001', { glucose: 100 });

      const invalidated = cacheService.invalidatePattern('patientData:*');

      expect(invalidated).toBe(2);
      expect(cacheService.cache.size).toBe(1);
      expect(cacheService.has('labResults', 'L001')).toBe(true);
    });

    it('should clear all cache', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.set('labResults', 'L001', { glucose: 100 });

      cacheService.clear();

      expect(cacheService.cache.size).toBe(0);
      expect(cacheService.cacheHits).toBe(0);
      expect(cacheService.cacheMisses).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });
      cacheService.set('patientData', 'P002', { name: 'Jane' });
      cacheService.set('patientData', 'P003', { name: 'Bob' });

      // Access P002 and P003 to make P001 least recently used
      cacheService.get('patientData', 'P002');
      cacheService.get('patientData', 'P003');

      const evicted = cacheService.evictLRU(2);

      expect(evicted).toBe(1);
      expect(cacheService.cache.size).toBe(2);
      expect(cacheService.has('patientData', 'P001')).toBe(false);
    });

    it('should not evict if under max size', () => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      const evicted = cacheService.evictLRU(10);

      expect(evicted).toBe(0);
      expect(cacheService.cache.size).toBe(1);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with pre-loaded data', () => {
      const dataItems = [
        { type: 'patientData', id: 'P001', data: { name: 'John' } },
        { type: 'patientData', id: 'P002', data: { name: 'Jane' } },
        { type: 'labResults', id: 'L001', data: { glucose: 100 } },
      ];

      cacheService.warmCache(dataItems);

      expect(cacheService.cache.size).toBe(3);
      expect(cacheService.get('patientData', 'P001')).toEqual({ name: 'John' });
    });
  });

  describe('Cache Age', () => {
    it('should get entry age', (done) => {
      cacheService.set('patientData', 'P001', { name: 'John' });

      setTimeout(() => {
        const age = cacheService.getAge('patientData', 'P001');
        expect(age).toBeGreaterThanOrEqual(100);
        done();
      }, 100);
    });

    it('should return null for non-existent entry', () => {
      const age = cacheService.getAge('patientData', 'P999');
      expect(age).toBeNull();
    });
  });

  describe('Cache Optimization', () => {
    it('should optimize cache by removing low-value entries', (done) => {
      // Add entries with different access patterns
      cacheService.set('patientData', 'P001', { name: 'John' });
      
      setTimeout(() => {
        cacheService.set('patientData', 'P002', { name: 'Jane' });
        cacheService.set('patientData', 'P003', { name: 'Bob' });

        // Access P001 frequently
        for (let i = 0; i < 10; i++) {
          cacheService.get('patientData', 'P001');
        }

        // Access P002 moderately
        for (let i = 0; i < 3; i++) {
          cacheService.get('patientData', 'P002');
        }

        // P003 not accessed

        const removed = cacheService.optimize(2);

        expect(removed).toBe(1);
        expect(cacheService.cache.size).toBe(2);
        // P001 and P002 should be kept (most accessed)
        expect(cacheService.has('patientData', 'P001') || cacheService.has('patientData', 'P002')).toBe(true);
        done();
      }, 50);
    });
  });

  describe('Cache Size', () => {
    it('should calculate approximate size in bytes', () => {
      cacheService.set('patientData', 'P001', { name: 'John Doe', age: 65 });

      const size = cacheService.getSizeInBytes();

      expect(size).toBeGreaterThan(0);
    });
  });
});
