/**
 * Unit Tests for Connection Pool
 * For physician review only
 */

const ConnectionPool = require('../src/services/connection-pool');

describe('Connection Pool', () => {
  let pool;

  beforeEach(() => {
    pool = new ConnectionPool(5); // Max 5 connections for testing
  });

  afterEach(() => {
    pool.clear();
  });

  describe('addConnection', () => {
    test('should add a connection to the pool', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      const connectionId = await pool.addConnection(connection);

      expect(connectionId).toBe('conn-1');
      expect(pool.connections.size).toBe(1);
    });

    test('should throw error when pool is full', async () => {
      // Fill the pool
      for (let i = 0; i < 5; i++) {
        await pool.addConnection({
          id: `conn-${i}`,
          type: 'epic',
          name: `Hospital ${i}`,
          baseUrl: `https://hospital${i}.com`,
          status: 'active'
        });
      }

      // Try to add one more
      await expect(pool.addConnection({
        id: 'conn-6',
        type: 'epic',
        name: 'Hospital 6',
        baseUrl: 'https://hospital6.com',
        status: 'active'
      })).rejects.toThrow('Connection pool limit reached');
    });

    test('should initialize request count and last used timestamp', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      const storedConnection = pool.getConnection('conn-1');

      expect(storedConnection.requestCount).toBe(1); // Incremented by getConnection
      expect(storedConnection.lastUsed).toBeDefined();
    });
  });

  describe('getConnection', () => {
    test('should retrieve an existing connection', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      const retrieved = pool.getConnection('conn-1');

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('conn-1');
      expect(retrieved.type).toBe('epic');
    });

    test('should return null for non-existent connection', () => {
      const retrieved = pool.getConnection('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should increment request count on each retrieval', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      
      pool.getConnection('conn-1');
      pool.getConnection('conn-1');
      const retrieved = pool.getConnection('conn-1');

      expect(retrieved.requestCount).toBe(3);
    });

    test('should update last used timestamp', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      const firstTimestamp = pool.getConnection('conn-1').lastUsed;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const secondTimestamp = pool.getConnection('conn-1').lastUsed;

      expect(secondTimestamp).not.toBe(firstTimestamp);
    });
  });

  describe('removeConnection', () => {
    test('should remove an existing connection', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      expect(pool.connections.size).toBe(1);

      await pool.removeConnection('conn-1');
      expect(pool.connections.size).toBe(0);
    });

    test('should throw error when removing connection with active requests', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      pool.trackRequest('conn-1');

      await expect(pool.removeConnection('conn-1'))
        .rejects.toThrow('Cannot remove connection with 1 active requests');
    });
  });

  describe('trackRequest and releaseRequest', () => {
    test('should track active requests', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      
      pool.trackRequest('conn-1');
      pool.trackRequest('conn-1');

      expect(pool.activeRequests.get('conn-1')).toBe(2);
    });

    test('should release tracked requests', async () => {
      const connection = {
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      };

      await pool.addConnection(connection);
      
      pool.trackRequest('conn-1');
      pool.trackRequest('conn-1');
      pool.releaseRequest('conn-1');

      expect(pool.activeRequests.get('conn-1')).toBe(1);
    });

    test('should not go below zero when releasing', () => {
      pool.releaseRequest('conn-1');
      pool.releaseRequest('conn-1');

      expect(pool.activeRequests.get('conn-1')).toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    test('should return correct statistics', async () => {
      await pool.addConnection({
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        status: 'active'
      });

      await pool.addConnection({
        id: 'conn-2',
        type: 'cerner',
        name: 'Cerner Hospital',
        baseUrl: 'https://cerner.example.com',
        status: 'active'
      });

      pool.trackRequest('conn-1');

      const stats = pool.getStatistics();

      expect(stats.totalConnections).toBe(2);
      expect(stats.maxConnections).toBe(5);
      expect(stats.availableSlots).toBe(3);
      expect(stats.connections).toHaveLength(2);
      expect(stats.connections[0].activeRequests).toBe(1);
    });

    test('should return empty statistics for empty pool', () => {
      const stats = pool.getStatistics();

      expect(stats.totalConnections).toBe(0);
      expect(stats.maxConnections).toBe(5);
      expect(stats.availableSlots).toBe(5);
      expect(stats.connections).toHaveLength(0);
    });
  });

  describe('getConnectionsByType', () => {
    test('should return connections of specific type', async () => {
      await pool.addConnection({
        id: 'conn-1',
        type: 'epic',
        name: 'Epic Hospital 1',
        baseUrl: 'https://epic1.example.com',
        status: 'active'
      });

      await pool.addConnection({
        id: 'conn-2',
        type: 'cerner',
        name: 'Cerner Hospital',
        baseUrl: 'https://cerner.example.com',
        status: 'active'
      });

      await pool.addConnection({
        id: 'conn-3',
        type: 'epic',
        name: 'Epic Hospital 2',
        baseUrl: 'https://epic2.example.com',
        status: 'active'
      });

      const epicConnections = pool.getConnectionsByType('epic');

      expect(epicConnections).toHaveLength(2);
      expect(epicConnections.every(conn => conn.type === 'epic')).toBe(true);
    });

    test('should return empty array for type with no connections', () => {
      const connections = pool.getConnectionsByType('meditech');
      expect(connections).toHaveLength(0);
    });
  });

  describe('hasCapacity', () => {
    test('should return true when pool has capacity', () => {
      expect(pool.hasCapacity()).toBe(true);
    });

    test('should return false when pool is full', async () => {
      for (let i = 0; i < 5; i++) {
        await pool.addConnection({
          id: `conn-${i}`,
          type: 'epic',
          name: `Hospital ${i}`,
          baseUrl: `https://hospital${i}.com`,
          status: 'active'
        });
      }

      expect(pool.hasCapacity()).toBe(false);
    });
  });

  describe('getLRUConnection', () => {
    test('should return least recently used connection', async () => {
      await pool.addConnection({
        id: 'conn-1',
        type: 'epic',
        name: 'Hospital 1',
        baseUrl: 'https://hospital1.com',
        status: 'active'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await pool.addConnection({
        id: 'conn-2',
        type: 'cerner',
        name: 'Hospital 2',
        baseUrl: 'https://hospital2.com',
        status: 'active'
      });

      // Access conn-2 to update its timestamp
      pool.getConnection('conn-2');

      const lru = pool.getLRUConnection();
      expect(lru.id).toBe('conn-1');
    });

    test('should return null for empty pool', () => {
      const lru = pool.getLRUConnection();
      expect(lru).toBeNull();
    });
  });

  describe('clear', () => {
    test('should clear all connections', async () => {
      await pool.addConnection({
        id: 'conn-1',
        type: 'epic',
        name: 'Hospital 1',
        baseUrl: 'https://hospital1.com',
        status: 'active'
      });

      await pool.addConnection({
        id: 'conn-2',
        type: 'cerner',
        name: 'Hospital 2',
        baseUrl: 'https://hospital2.com',
        status: 'active'
      });

      pool.trackRequest('conn-1');

      expect(pool.connections.size).toBe(2);
      expect(pool.activeRequests.size).toBe(1);

      pool.clear();

      expect(pool.connections.size).toBe(0);
      expect(pool.activeRequests.size).toBe(0);
    });
  });
});
