// Multi-Client Database Adapter with Isolated Connections - CORRECTED VERSION
// File: backend/src/core/services/MultiClientDatabaseAdapter.ts

import { ClientConfig } from '../types/client-types';
import * as fs from 'fs';
import * as path from 'path';

interface DatabaseConnection {
  clientId: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  connection: any;
  pool?: any;
  schema?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  queryCount: number;
}

interface QueryResult {
  success: boolean;
  data: any[];
  rowCount: number;
  executionTime: number;
  error?: string;
  fromCache?: boolean; // FIXED: Added missing property
}

interface DatabaseSchema {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primaryKey: boolean;
      foreignKey?: {
        table: string;
        column: string;
      };
    }>;
  }>;
  views: Array<{
    name: string;
    definition: string;
  }>;
}

export class MultiClientDatabaseAdapter {
  private clientConnections = new Map<string, DatabaseConnection>();
  private connectionPools = new Map<string, any>();
  private schemaCache = new Map<string, DatabaseSchema>();
  private queryCache = new Map<string, { result: QueryResult; timestamp: Date }>();
  
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONNECTIONS_PER_CLIENT = 10;

  /**
   * Initialize the multi-client database system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Multi-Client Database Adapter...');

    // Set up connection monitoring
    setInterval(() => {
      this.monitorConnections();
    }, 30000); // Check every 30 seconds

    // Set up cache cleanup
    setInterval(() => {
      this.cleanupQueryCache();
    }, 60000); // Cleanup every minute

    console.log('Multi-Client Database Adapter ready');
  }

  /**
   * Initialize database connection for a specific client
   */
  async initializeClient(clientId: string, clientConfig: ClientConfig): Promise<void> {
    console.log(`Initializing database for client ${clientId}`);

    try {
      const { database } = clientConfig;
      
      // Create connection based on database type
      let connection: any;
      let pool: any;

      switch (database.type) {
        case 'postgresql':
          ({ connection, pool } = await this.createPostgreSQLConnection(database));
          break;
        case 'mysql':
          ({ connection, pool } = await this.createMySQLConnection(database));
          break;
        case 'mongodb':
          ({ connection, pool } = await this.createMongoDBConnection(database));
          break;
        case 'sqlite':
          ({ connection, pool } = await this.createSQLiteConnection(database));
          break;
        default:
          throw new Error(`Unsupported database type: ${database.type}`);
      }

      // Test connection
      await this.testConnection(connection, database.type);

      // Store connection info
      const dbConnection: DatabaseConnection = {
        clientId,
        type: database.type,
        connection,
        pool,
        schema: database.schema,
        status: 'connected',
        lastActivity: new Date(),
        queryCount: 0
      };

      this.clientConnections.set(clientId, dbConnection);
      if (pool) {
        this.connectionPools.set(clientId, pool);
      }

      // Cache database schema
      await this.cacheClientSchema(clientId);

      console.log(`Database initialized for client ${clientId} (${database.type})`);

    } catch (error) {
      console.error(`Failed to initialize database for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Execute query for specific client
   */
  async queryForClient(clientId: string, sql: string, params: any[] = []): Promise<QueryResult> {
    const connection = this.clientConnections.get(clientId);
    if (!connection) {
      throw new Error(`No database connection found for client ${clientId}`);
    }

    // Check cache first
    const cacheKey = `${clientId}:${sql}:${JSON.stringify(params)}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
      return { ...cached.result, fromCache: true }; // FIXED: Now properly typed
    }

    const startTime = Date.now();

    try {
      let result: any;

      switch (connection.type) {
        case 'postgresql':
          result = await this.executePostgreSQLQuery(connection, sql, params);
          break;
        case 'mysql':
          result = await this.executeMySQLQuery(connection, sql, params);
          break;
        case 'mongodb':
          result = await this.executeMongoDBQuery(connection, sql, params);
          break;
        case 'sqlite':
          result = await this.executeSQLiteQuery(connection, sql, params);
          break;
        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }

      const executionTime = Date.now() - startTime;
      const queryResult: QueryResult = {
        success: true,
        data: result.rows || result.data || result,
        rowCount: result.rowCount || result.length || 0,
        executionTime,
        fromCache: false // FIXED: Explicitly set fromCache
      };

      // Update connection stats
      connection.lastActivity = new Date();
      connection.queryCount++;

      // Cache result for SELECT queries
      if (sql.trim().toLowerCase().startsWith('select')) {
        this.queryCache.set(cacheKey, {
          result: queryResult,
          timestamp: new Date()
        });
      }

      return queryResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Query failed for client ${clientId}:`, error);

      return {
        success: false,
        data: [],
        rowCount: 0,
        executionTime,
        fromCache: false, // FIXED: Added missing property
        error: (error as Error).message
      };
    }
  }

  /**
   * Get database schema for client
   */
  async getClientSchema(clientId: string): Promise<DatabaseSchema> {
    const schema = this.schemaCache.get(clientId);
    if (schema) {
      return schema;
    }

    // Regenerate schema if not cached
    await this.cacheClientSchema(clientId);
    return this.schemaCache.get(clientId) || { tables: [], views: [] };
  }

  /**
   * Get client-specific database adapter instance
   */
  getClientAdapter(clientId: string): ClientDatabaseAdapter | null {
    const connection = this.clientConnections.get(clientId);
    if (!connection) {
      console.warn(`No database connection found for client ${clientId}`);
      return null; // FIXED: Return null instead of throwing error for optional database usage
    }

    return new ClientDatabaseAdapter(clientId, this);
  }

  /**
   * Get connection statistics for client
   */
  getClientConnectionStats(clientId: string): any {
    const connection = this.clientConnections.get(clientId);
    if (!connection) {
      return null;
    }

    return {
      clientId,
      type: connection.type,
      status: connection.status,
      lastActivity: connection.lastActivity,
      queryCount: connection.queryCount,
      schema: connection.schema
    };
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const connectionCount = this.clientConnections.size;
      const activeConnections = Array.from(this.clientConnections.values())
        .filter(conn => conn.status === 'connected').length;

      return {
        status: connectionCount > 0 ? 'healthy' : 'no_connections',
        details: {
          totalConnections: connectionCount,
          activeConnections,
          cacheSize: this.queryCache.size,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          lastCheck: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Cleanup client database resources
   */
  async cleanupClient(clientId: string): Promise<void> {
    const connection = this.clientConnections.get(clientId);
    if (!connection) {
      console.warn(`No connection found for client ${clientId}`);
      return;
    }

    try {
      // Close connection
      if (connection.connection) {
        await this.closeConnection(connection.connection, connection.type);
      }

      // Close pool if exists
      const pool = this.connectionPools.get(clientId);
      if (pool) {
        await this.closePool(pool, connection.type);
        this.connectionPools.delete(clientId);
      }

      // Remove from memory
      this.clientConnections.delete(clientId);
      this.schemaCache.delete(clientId);

      // Clear related cache entries
      for (const [key] of this.queryCache) {
        if (key.startsWith(`${clientId}:`)) {
          this.queryCache.delete(key);
        }
      }

      console.log(`Database cleanup completed for client ${clientId}`);

    } catch (error) {
      console.error(`Failed to cleanup database for client ${clientId}:`, error);
    }
  }

  /**
   * Graceful shutdown of all connections
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Multi-Client Database Adapter...');
    
    const clientIds = Array.from(this.clientConnections.keys());
    
    for (const clientId of clientIds) {
      await this.cleanupClient(clientId);
    }
    
    this.queryCache.clear();
    console.log('Multi-Client Database Adapter shutdown complete');
  }

  // Private helper methods for database-specific operations

  private async createPostgreSQLConnection(config: any): Promise<{ connection: any; pool: any }> {
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: config.connectionString,
        max: this.MAX_CONNECTIONS_PER_CLIENT,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      const connection = await pool.connect();
      
      return { connection, pool };
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw new Error(`PostgreSQL connection failed: ${(error as Error).message}`);
    }
  }

  private async createMySQLConnection(config: any): Promise<{ connection: any; pool: any }> {
    try {
      const mysql = require('mysql2/promise');
      
      const pool = mysql.createPool({
        uri: config.connectionString,
        connectionLimit: this.MAX_CONNECTIONS_PER_CLIENT,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
      });

      const connection = await pool.getConnection();
      
      return { connection, pool };
    } catch (error) {
      console.error('MySQL connection failed:', error);
      throw new Error(`MySQL connection failed: ${(error as Error).message}`);
    }
  }

  private async createMongoDBConnection(config: any): Promise<{ connection: any; pool: any }> {
    try {
      const { MongoClient } = require('mongodb');
      
      const client = new MongoClient(config.connectionString, {
        maxPoolSize: this.MAX_CONNECTIONS_PER_CLIENT,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await client.connect();
      const connection = client.db(config.schema);
      
      return { connection, pool: client };
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw new Error(`MongoDB connection failed: ${(error as Error).message}`);
    }
  }

  private async createSQLiteConnection(config: any): Promise<{ connection: any; pool: any }> {
  try {
    const sqlite3 = require('sqlite3');
    const sqlite = require('sqlite');

    // 1. Define the full database file path
    const dbPath = config.connectionString.replace('sqlite://', '');
    const dbDir = path.dirname(dbPath);

    // 2. Ensure the database directory exists
    // The `recursive: true` option ensures parent directories are also created
    if (!fs.existsSync(dbDir)) {
      console.log(`Creating database directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 3. Open the connection
    const connection = await sqlite.open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('✅ SQLite connection established successfully');
    return { connection, pool: null };
  } catch (error) {
    console.error('❌ SQLite connection failed:', error);
    throw new Error(`SQLite connection failed: ${(error as Error).message}`);
  }
}

  private async testConnection(connection: any, type: string): Promise<void> {
    switch (type) {
      case 'postgresql':
        await connection.query('SELECT 1');
        break;
      case 'mysql':
        await connection.execute('SELECT 1');
        break;
      case 'mongodb':
        await connection.admin().ping();
        break;
      case 'sqlite':
        await connection.get('SELECT 1');
        break;
    }
  }

  private async executePostgreSQLQuery(connection: DatabaseConnection, sql: string, params: any[]): Promise<any> {
    return await connection.connection.query(sql, params);
  }

  private async executeMySQLQuery(connection: DatabaseConnection, sql: string, params: any[]): Promise<any> {
    const [rows] = await connection.connection.execute(sql, params);
    return { rows, rowCount: rows.length };
  }

  private async executeMongoDBQuery(connection: DatabaseConnection, query: string, params: any[]): Promise<any> {
    // For MongoDB, we'd need to parse the query and convert to MongoDB operations
    // This is a simplified implementation - would need proper MongoDB query parsing
    console.warn('MongoDB query execution requires custom implementation for your use case');
    throw new Error('MongoDB query execution not implemented - requires domain-specific implementation');
  }

  private async executeSQLiteQuery(connection: DatabaseConnection, sql: string, params: any[]): Promise<any> {
    const result = await connection.connection.all(sql, params);
    return { rows: result, rowCount: result.length };
  }

  private async cacheClientSchema(clientId: string): Promise<void> {
    const connection = this.clientConnections.get(clientId);
    if (!connection) return;

    try {
      let schema: DatabaseSchema = { tables: [], views: [] };

      switch (connection.type) {
        case 'postgresql':
          schema = await this.getPostgreSQLSchema(connection);
          break;
        case 'mysql':
          schema = await this.getMySQLSchema(connection);
          break;
        case 'sqlite':
          schema = await this.getSQLiteSchema(connection);
          break;
        case 'mongodb':
          console.log('MongoDB schema caching not implemented - dynamic schema');
          break;
      }

      this.schemaCache.set(clientId, schema);
      console.log(`Cached schema for client ${clientId}: ${schema.tables.length} tables`);

    } catch (error) {
      console.error(`Failed to cache schema for client ${clientId}:`, error);
    }
  }

  private async getPostgreSQLSchema(connection: DatabaseConnection): Promise<DatabaseSchema> {
    const tableQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      WHERE t.table_schema = $1
      ORDER BY t.table_name, c.ordinal_position
    `;

    const result = await connection.connection.query(tableQuery, [connection.schema || 'public']);
    const tables = this.groupTableColumns(result.rows);
    
    return { tables, views: [] };
  }

  private async getMySQLSchema(connection: DatabaseConnection): Promise<DatabaseSchema> {
    const tableQuery = `
      SELECT 
        t.TABLE_NAME as table_name,
        c.COLUMN_NAME as column_name,
        c.DATA_TYPE as data_type,
        c.IS_NULLABLE as is_nullable,
        CASE WHEN c.COLUMN_KEY = 'PRI' THEN true ELSE false END as is_primary_key
      FROM information_schema.TABLES t
      LEFT JOIN information_schema.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
      WHERE t.TABLE_SCHEMA = ?
      ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
    `;

    const [rows] = await connection.connection.execute(tableQuery, [connection.schema]);
    const tables = this.groupTableColumns(rows);
    
    return { tables, views: [] };
  }

  private async getSQLiteSchema(connection: DatabaseConnection): Promise<DatabaseSchema> {
    const tablesResult = await connection.connection.all("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = [];

    for (const table of tablesResult) {
      const columnsResult = await connection.connection.all(`PRAGMA table_info(${table.name})`);
      const columns = columnsResult.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        primaryKey: !!col.pk
      }));

      tables.push({
        name: table.name,
        columns
      });
    }

    return { tables, views: [] };
  }

  private groupTableColumns(rows: any[]): any[] {
    const tableMap = new Map();

    for (const row of rows) {
      if (!tableMap.has(row.table_name)) {
        tableMap.set(row.table_name, {
          name: row.table_name,
          columns: []
        });
      }

      if (row.column_name) {
        tableMap.get(row.table_name).columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES' || row.is_nullable === true,
          primaryKey: row.is_primary_key === true || row.is_primary_key === 1
        });
      }
    }

    return Array.from(tableMap.values());
  }

  private async closeConnection(connection: any, type: string): Promise<void> {
    switch (type) {
      case 'postgresql':
        await connection.release();
        break;
      case 'mysql':
        await connection.release();
        break;
      case 'mongodb':
        // Connection is closed when pool is closed
        break;
      case 'sqlite':
        await connection.close();
        break;
    }
  }

  private async closePool(pool: any, type: string): Promise<void> {
    switch (type) {
      case 'postgresql':
        await pool.end();
        break;
      case 'mysql':
        await pool.end();
        break;
      case 'mongodb':
        await pool.close();
        break;
      case 'sqlite':
        // SQLite doesn't use pools
        break;
    }
  }

  private monitorConnections(): void {
    for (const [clientId, connection] of this.clientConnections) {
      const timeSinceActivity = Date.now() - connection.lastActivity.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeSinceActivity > fiveMinutes) {
        console.log(`Client ${clientId} database connection has been idle for ${Math.round(timeSinceActivity / 60000)} minutes`);
      }
    }
  }

  private cleanupQueryCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache) {
      if (now - cached.timestamp.getTime() > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
  }
}

/**
 * Client-specific database adapter instance
 */
export class ClientDatabaseAdapter {
  constructor(
    private clientId: string,
    private multiClientAdapter: MultiClientDatabaseAdapter
  ) {}

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    return await this.multiClientAdapter.queryForClient(this.clientId, sql, params);
  }

  async getSchema(): Promise<DatabaseSchema> {
    return await this.multiClientAdapter.getClientSchema(this.clientId);
  }

  getConnectionStats(): any {
    return this.multiClientAdapter.getClientConnectionStats(this.clientId);
  }

  // Domain-specific query helpers can be added here
  async findCustomers(filters: any = {}): Promise<any[]> {
    try {
      // Basic implementation - adapt to your database schema
      const result = await this.query('SELECT * FROM customers WHERE 1=1', []);
      return result.data;
    } catch (error) {
      console.error('findCustomers failed:', error);
      return [];
    }
  }

  async logActivity(activity: string, metadata: any = {}): Promise<void> {
    try {
      await this.query(
        'INSERT INTO activity_log (client_id, activity, metadata, created_at) VALUES (?, ?, ?, ?)',
        [this.clientId, activity, JSON.stringify(metadata), new Date()]
      );
    } catch (error) {
      // Don't fail if activity logging fails
      console.error('Failed to log activity:', error);
    }
  }
}