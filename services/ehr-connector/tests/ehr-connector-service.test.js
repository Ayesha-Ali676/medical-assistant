/**
 * Unit Tests for EHR Connector Service
 * For physician review only
 */

const EHRConnectorService = require('../src/services/ehr-connector-service');

describe('EHR Connector Service', () => {
  let ehrConnector;

  beforeEach(() => {
    ehrConnector = new EHRConnectorService();
  });

  afterEach(() => {
    // Clear any active connections
    ehrConnector.activeConnections.clear();
    ehrConnector.dataCache.clear();
  });

  describe('registerEHRSystem', () => {
    test('should successfully register a valid EHR system', async () => {
      const config = {
        type: 'epic',
        name: 'Epic Test Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'test-api-key',
        version: '1.0'
      };

      const result = await ehrConnector.registerEHRSystem(config);

      expect(result).toHaveProperty('connectionId');
      expect(result.status).toBe('registered');
      expect(ehrConnector.activeConnections.size).toBe(1);
    });

    test('should reject registration without required fields', async () => {
      const invalidConfig = {
        type: 'epic',
        name: 'Test Hospital'
        // Missing baseUrl and authentication
      };

      await expect(ehrConnector.registerEHRSystem(invalidConfig))
        .rejects.toThrow('Base URL is required');
    });

    test('should reject invalid EHR type', async () => {
      const config = {
        type: 'invalid-type',
        name: 'Test Hospital',
        baseUrl: 'https://example.com',
        apiKey: 'test-key'
      };

      await expect(ehrConnector.registerEHRSystem(config))
        .rejects.toThrow('Invalid EHR type');
    });

    test('should support all valid EHR types', async () => {
      const types = ['epic', 'cerner', 'allscripts', 'meditech', 'custom'];

      for (const type of types) {
        const config = {
          type,
          name: `${type} Hospital`,
          baseUrl: `https://${type}.example.com`,
          apiKey: 'test-key'
        };

        const result = await ehrConnector.registerEHRSystem(config);
        expect(result.status).toBe('registered');
      }

      expect(ehrConnector.activeConnections.size).toBe(5);
    });
  });

  describe('getActiveConnections', () => {
    test('should return empty array when no connections', () => {
      const connections = ehrConnector.getActiveConnections();
      expect(connections).toEqual([]);
    });

    test('should return all active connections', async () => {
      const config1 = {
        type: 'epic',
        name: 'Epic Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'key1'
      };

      const config2 = {
        type: 'cerner',
        name: 'Cerner Hospital',
        baseUrl: 'https://cerner.example.com',
        apiKey: 'key2'
      };

      await ehrConnector.registerEHRSystem(config1);
      await ehrConnector.registerEHRSystem(config2);

      const connections = ehrConnector.getActiveConnections();
      expect(connections).toHaveLength(2);
      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('name');
    });
  });

  describe('removeConnection', () => {
    test('should successfully remove an existing connection', async () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'test-key'
      };

      const { connectionId } = await ehrConnector.registerEHRSystem(config);
      expect(ehrConnector.activeConnections.size).toBe(1);

      const result = await ehrConnector.removeConnection(connectionId);
      expect(result.status).toBe('removed');
      expect(ehrConnector.activeConnections.size).toBe(0);
    });

    test('should throw error when removing non-existent connection', async () => {
      await expect(ehrConnector.removeConnection('non-existent-id'))
        .rejects.toThrow('Connection not found');
    });
  });

  describe('clearCache', () => {
    test('should clear cache for specific connection', async () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'test-key'
      };

      const { connectionId } = await ehrConnector.registerEHRSystem(config);
      
      // Add some cache entries
      ehrConnector.dataCache.set(`${connectionId}:patient1`, { data: 'test1' });
      ehrConnector.dataCache.set(`${connectionId}:patient2`, { data: 'test2' });
      ehrConnector.dataCache.set('other:patient3', { data: 'test3' });

      expect(ehrConnector.dataCache.size).toBe(3);

      ehrConnector.clearCache(connectionId);

      expect(ehrConnector.dataCache.size).toBe(1);
      expect(ehrConnector.dataCache.has('other:patient3')).toBe(true);
    });

    test('should clear all cache when no connectionId provided', () => {
      ehrConnector.dataCache.set('conn1:patient1', { data: 'test1' });
      ehrConnector.dataCache.set('conn2:patient2', { data: 'test2' });

      expect(ehrConnector.dataCache.size).toBe(2);

      ehrConnector.clearCache();

      expect(ehrConnector.dataCache.size).toBe(0);
    });
  });

  describe('validateEHRConfig', () => {
    test('should validate correct configuration', () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'test-key'
      };

      expect(() => ehrConnector.validateEHRConfig(config)).not.toThrow();
    });

    test('should accept credentials instead of apiKey', () => {
      const config = {
        type: 'cerner',
        name: 'Test Hospital',
        baseUrl: 'https://cerner.example.com',
        credentials: {
          username: 'user',
          password: 'pass'
        }
      };

      expect(() => ehrConnector.validateEHRConfig(config)).not.toThrow();
    });

    test('should throw error for missing type', () => {
      const config = {
        name: 'Test Hospital',
        baseUrl: 'https://example.com',
        apiKey: 'test-key'
      };

      expect(() => ehrConnector.validateEHRConfig(config))
        .toThrow('EHR type is required');
    });

    test('should throw error for missing name', () => {
      const config = {
        type: 'epic',
        baseUrl: 'https://example.com',
        apiKey: 'test-key'
      };

      expect(() => ehrConnector.validateEHRConfig(config))
        .toThrow('EHR name is required');
    });

    test('should throw error for missing baseUrl', () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        apiKey: 'test-key'
      };

      expect(() => ehrConnector.validateEHRConfig(config))
        .toThrow('Base URL is required');
    });

    test('should throw error for missing authentication', () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        baseUrl: 'https://example.com'
      };

      expect(() => ehrConnector.validateEHRConfig(config))
        .toThrow('Authentication credentials are required');
    });
  });

  describe('concurrent operations', () => {
    test('should handle multiple registrations concurrently', async () => {
      const configs = [
        { type: 'epic', name: 'Epic 1', baseUrl: 'https://epic1.com', apiKey: 'key1' },
        { type: 'cerner', name: 'Cerner 1', baseUrl: 'https://cerner1.com', apiKey: 'key2' },
        { type: 'allscripts', name: 'Allscripts 1', baseUrl: 'https://allscripts1.com', apiKey: 'key3' }
      ];

      const promises = configs.map(config => ehrConnector.registerEHRSystem(config));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(ehrConnector.activeConnections.size).toBe(3);
      results.forEach(result => {
        expect(result.status).toBe('registered');
      });
    });
  });

  describe('connection health check', () => {
    test('should return not_found for non-existent connection', async () => {
      const result = await ehrConnector.checkConnectionHealth('non-existent-id');
      expect(result.status).toBe('not_found');
    });

    test('should track health check for existing connection', async () => {
      const config = {
        type: 'epic',
        name: 'Test Hospital',
        baseUrl: 'https://epic.example.com',
        apiKey: 'test-key'
      };

      const { connectionId } = await ehrConnector.registerEHRSystem(config);
      const connection = ehrConnector.activeConnections.get(connectionId);
      
      expect(connection.lastHealthCheck).toBeNull();
    });
  });
});
