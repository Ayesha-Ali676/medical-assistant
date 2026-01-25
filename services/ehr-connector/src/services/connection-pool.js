/**
 * Connection Pool Manager
 * Manages concurrent connections to multiple EHR systems
 * For physician review only
 */

class ConnectionPool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.connections = new Map();
    this.activeRequests = new Map();
  }

  /**
   * Add a new connection to the pool
   */
  async addConnection(connection) {
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Connection pool limit reached (${this.maxConnections})`);
    }
    
    this.connections.set(connection.id, {
      ...connection,
      requestCount: 0,
      lastUsed: new Date().toISOString()
    });
    
    return connection.id;
  }

  /**
   * Get a connection from the pool
   */
  getConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return null;
    }
    
    // Update usage statistics
    connection.requestCount++;
    connection.lastUsed = new Date().toISOString();
    
    return connection;
  }

  /**
   * Remove a connection from the pool
   */
  async removeConnection(connectionId) {
    // Wait for any active requests to complete
    if (this.activeRequests.has(connectionId)) {
      const activeCount = this.activeRequests.get(connectionId);
      if (activeCount > 0) {
        throw new Error(`Cannot remove connection with ${activeCount} active requests`);
      }
    }
    
    this.connections.delete(connectionId);
    this.activeRequests.delete(connectionId);
    
    return true;
  }

  /**
   * Track active request for a connection
   */
  trackRequest(connectionId) {
    const current = this.activeRequests.get(connectionId) || 0;
    this.activeRequests.set(connectionId, current + 1);
  }

  /**
   * Release a tracked request
   */
  releaseRequest(connectionId) {
    const current = this.activeRequests.get(connectionId) || 0;
    if (current > 0) {
      this.activeRequests.set(connectionId, current - 1);
    }
  }

  /**
   * Get pool statistics
   */
  getStatistics() {
    const stats = {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      availableSlots: this.maxConnections - this.connections.size,
      connections: []
    };
    
    for (const [id, conn] of this.connections) {
      stats.connections.push({
        id,
        type: conn.type,
        name: conn.name,
        status: conn.status,
        requestCount: conn.requestCount,
        activeRequests: this.activeRequests.get(id) || 0,
        lastUsed: conn.lastUsed
      });
    }
    
    return stats;
  }

  /**
   * Get all connections of a specific type
   */
  getConnectionsByType(ehrType) {
    const connections = [];
    
    for (const [id, conn] of this.connections) {
      if (conn.type === ehrType) {
        connections.push({
          id,
          ...conn
        });
      }
    }
    
    return connections;
  }

  /**
   * Check if pool has capacity for new connections
   */
  hasCapacity() {
    return this.connections.size < this.maxConnections;
  }

  /**
   * Get least recently used connection (for potential cleanup)
   */
  getLRUConnection() {
    let lruConnection = null;
    let oldestTime = new Date();
    
    for (const [id, conn] of this.connections) {
      const lastUsed = new Date(conn.lastUsed);
      if (lastUsed < oldestTime) {
        oldestTime = lastUsed;
        lruConnection = { id, ...conn };
      }
    }
    
    return lruConnection;
  }

  /**
   * Clear all connections (for testing or reset)
   */
  clear() {
    this.connections.clear();
    this.activeRequests.clear();
  }
}

module.exports = ConnectionPool;
