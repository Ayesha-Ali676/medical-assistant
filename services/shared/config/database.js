/**
 * Database Configuration
 * Multi-database architecture for MedAssist Clinical System
 * For physician review only
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const { InfluxDB } = require('@influxdata/influxdb-client');

// PostgreSQL configuration (structured clinical data)
const postgresConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'medassist',
  user: process.env.POSTGRES_USER || 'medassist',
  password: process.env.POSTGRES_PASSWORD || 'medassist_secure_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// MongoDB configuration (unstructured clinical notes, AI content)
const mongoConfig = {
  url: process.env.MONGODB_URL || 'mongodb://medassist:medassist_secure_2024@localhost:27017/medassist',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

// Redis configuration (caching, sessions)
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || 'medassist_secure_2024',
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// InfluxDB configuration (time-series data for vitals, trends)
const influxConfig = {
  url: process.env.INFLUXDB_URL || 'http://localhost:8086',
  token: process.env.INFLUXDB_TOKEN || 'medassist_token_2024',
  org: process.env.INFLUXDB_ORG || 'medassist',
  bucket: process.env.INFLUXDB_BUCKET || 'clinical_data',
};

class DatabaseManager {
  constructor() {
    this.postgres = null;
    this.mongodb = null;
    this.redis = null;
    this.influx = null;
  }

  async initializePostgreSQL() {
    try {
      this.postgres = new Pool(postgresConfig);
      
      // Test connection
      const client = await this.postgres.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('PostgreSQL connected successfully');
      return this.postgres;
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async initializeMongoDB() {
    try {
      this.mongodb = new MongoClient(mongoConfig.url, mongoConfig.options);
      await this.mongodb.connect();
      
      // Test connection
      await this.mongodb.db().admin().ping();
      
      console.log('MongoDB connected successfully');
      return this.mongodb;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      this.redis = redis.createClient(redisConfig);
      
      this.redis.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });
      
      this.redis.on('connect', () => {
        console.log('Redis connected successfully');
      });
      
      await this.redis.connect();
      
      // Test connection
      await this.redis.ping();
      
      return this.redis;
    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  async initializeInfluxDB() {
    try {
      this.influx = new InfluxDB(influxConfig);
      
      // Test connection
      const queryApi = this.influx.getQueryApi(influxConfig.org);
      await queryApi.queryRaw('buckets()');
      
      console.log('InfluxDB connected successfully');
      return this.influx;
    } catch (error) {
      console.error('InfluxDB connection failed:', error);
      throw error;
    }
  }

  async initializeAll() {
    try {
      await Promise.all([
        this.initializePostgreSQL(),
        this.initializeMongoDB(),
        this.initializeRedis(),
        this.initializeInfluxDB()
      ]);
      
      console.log('All databases initialized successfully');
      console.log('Clinical Decision Support System - For physician review only');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async closeAll() {
    const promises = [];
    
    if (this.postgres) {
      promises.push(this.postgres.end());
    }
    
    if (this.mongodb) {
      promises.push(this.mongodb.close());
    }
    
    if (this.redis) {
      promises.push(this.redis.quit());
    }
    
    if (this.influx) {
      promises.push(this.influx.close());
    }
    
    await Promise.all(promises);
    console.log('All database connections closed');
  }

  // Utility methods for common operations
  async executeQuery(query, params = []) {
    if (!this.postgres) {
      throw new Error('PostgreSQL not initialized');
    }
    
    const client = await this.postgres.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getMongoCollection(collectionName) {
    if (!this.mongodb) {
      throw new Error('MongoDB not initialized');
    }
    
    return this.mongodb.db().collection(collectionName);
  }

  async cacheSet(key, value, ttl = 3600) {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }
    
    return await this.redis.setEx(key, ttl, JSON.stringify(value));
  }

  async cacheGet(key) {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }
    
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  getInfluxWriteApi() {
    if (!this.influx) {
      throw new Error('InfluxDB not initialized');
    }
    
    return this.influx.getWriteApi(influxConfig.org, influxConfig.bucket);
  }

  getInfluxQueryApi() {
    if (!this.influx) {
      throw new Error('InfluxDB not initialized');
    }
    
    return this.influx.getQueryApi(influxConfig.org);
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  dbManager,
  postgresConfig,
  mongoConfig,
  redisConfig,
  influxConfig
};