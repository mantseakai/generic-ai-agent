import { Express, Router } from 'express';
import { ClientManager } from '../services/ClientManager';
import { MultiClientVectorStore } from '../services/MultiClientVectorStore';
import { MultiClientDatabaseAdapter } from '../services/MultiClientDatabaseAdapter';
import { createClientChatRoutes } from './client-chat';
import { createClientManagementRoutes } from './client-management';
import { createMultiClientWhatsAppRoutes } from './whatsapp-routes';

export class RouteIntegration {
  private clientManager: ClientManager;
  private vectorStore: MultiClientVectorStore;
  private databaseAdapter: MultiClientDatabaseAdapter;
  private initialized: boolean = false;

  constructor() {
    this.vectorStore = new MultiClientVectorStore();
    this.databaseAdapter = new MultiClientDatabaseAdapter();
    this.clientManager = new ClientManager(this.vectorStore, this.databaseAdapter);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️  Route integration already initialized');
      return;
    }

    console.log('🚀 Initializing Multi-Client Route Integration...');

    try {
      await this.vectorStore.initialize();
      console.log('✅ Vector store initialized');

      await this.databaseAdapter.initialize();
      console.log('✅ Database adapter initialized');

      await this.clientManager.initialize();
      console.log('✅ Client manager initialized');

      this.initialized = true;
      console.log('🎉 Multi-Client Route Integration ready!');

    } catch (error) {
      console.error('❌ Failed to initialize route integration:', error);
      throw error;
    }
  }

  /**
   * FIXED: Setup all multi-client routes with proper WhatsApp mounting
   */
  setupRoutes(app: Express): void {
    if (!this.initialized) {
      throw new Error('Route integration must be initialized before setting up routes');
    }

    console.log('📡 Setting up multi-client routes...');

    // 1. Client Management Routes (Admin)
    const clientManagementRoutes = createClientManagementRoutes(this.clientManager);
    app.use('/api/admin', clientManagementRoutes);
    console.log('✅ Admin client management routes: /api/admin/*');

    // 2. Multi-Client Chat Routes
    const clientChatRoutes = createClientChatRoutes(this.clientManager);
    app.use('/api/clients', clientChatRoutes);
    console.log('✅ Multi-client chat routes: /api/clients/*');

    // 3. FIXED: Enhanced WhatsApp Routes (Multi-Client) - PROPER MOUNTING
    const whatsappRoutes = createMultiClientWhatsAppRoutes(this.clientManager);
    app.use('/api/clients', whatsappRoutes);
    console.log('✅ Multi-client WhatsApp routes: /api/clients/*/whatsapp/*');

    // 4. ADDED: Missing /api/agents/status route for backward compatibility
    app.get('/api/agents/status', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        const clientCount = this.clientManager.getTotalClientCount();
        
        res.json({
          success: true,
          agents: {
            original: { 
              type: 'insurance', 
              endpoint: '/api/chat/message', 
              status: 'active' 
            },
            generic: { 
              type: 'insurance', 
              endpoint: '/api/generic/insurance/message', 
              status: 'testing' 
            },
            multiClient: {
              type: 'multi-domain',
              endpoints: [
                '/api/clients/:clientId/chat/:domain/message',
                '/api/clients/:clientId/whatsapp/qr-code',
                '/api/admin/clients'
              ],
              status: health.status === 'healthy' ? 'active' : 'initializing',
              features: [
                'multi_client_isolation',
                'client_specific_branding', 
                'domain_agnostic_ai',
                'scalable_architecture',
                'usage_analytics'
              ],
              clients: clientCount
            }
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting agent status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get agent status'
        });
      }
    });
    console.log('✅ Added missing /api/agents/status route');

    // 5. Analytics and Monitoring Routes
    this.setupAnalyticsRoutes(app);
    console.log('✅ Analytics routes: /api/clients/*/analytics/*');

    console.log('🎯 All multi-client routes registered successfully!');
    this.logAvailableEndpoints();
  }

  /**
   * Setup analytics and monitoring routes
   */
  private setupAnalyticsRoutes(app: Express): void {
    // Client analytics dashboard
    app.get('/api/clients/:clientId/analytics/dashboard', async (req, res) => {
      try {
        const { clientId } = req.params;
        
        const client = await this.clientManager.getClient(clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            error: 'Client not found'
          });
        }

        const analytics = await this.generateClientAnalytics(clientId);
        
        res.json({
          success: true,
          data: analytics
        });

      } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate analytics'
        });
      }
    });

    // System health endpoint
    app.get('/api/system/health', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        res.json({
          success: true,
          data: health
        });
      } catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to check system health'
        });
      }
    });
  }

  /**
   * Generate analytics data for a client
   */
  private async generateClientAnalytics(clientId: string): Promise<any> {
    try {
      const client = await this.clientManager.getClient(clientId);
      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      return {
        clientId,
        organizationName: client.organizationName,
        totalMessages: 0,
        messagesThisWeek: 0,
        messagesThisMonth: 0,
        averageResponseTime: 1.2,
        satisfaction: 4.5,
        domains: client.domains,
        whatsappEnabled: !!(client.whatsapp && client.whatsapp.businessPhoneNumber),
        status: client.status || 'active',
        lastActivity: new Date(),
        usage: {
          today: { messages: 0, socialPosts: 0, queries: 0 },
          thisWeek: { messages: 0, socialPosts: 0, queries: 0 },
          thisMonth: { messages: 0, socialPosts: 0, queries: 0 }
        }
      };
    } catch (error) {
      console.error('Error generating client analytics:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<any> {
    try {
      const clientCount = this.clientManager.getTotalClientCount();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        clients: {
          total: clientCount,
          active: clientCount,
          inactive: 0
        },
        services: {
          clientManager: this.clientManager ? 'healthy' : 'error',
          vectorStore: this.vectorStore ? 'healthy' : 'error',
          databaseAdapter: this.databaseAdapter ? 'healthy' : 'error'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log all available endpoints for debugging
   */
  private logAvailableEndpoints(): void {
    console.log('');
    console.log('📋 Available Multi-Client Endpoints:');
    console.log('');
    console.log('🔧 Admin & Management:');
    console.log('  POST   /api/admin/clients                           - Create new client');
    console.log('  GET    /api/admin/clients                           - List all clients');
    console.log('  PUT    /api/admin/clients/:clientId                 - Update client');
    console.log('  DELETE /api/admin/clients/:clientId                 - Delete client');
    console.log('');
    console.log('💬 Multi-Client Chat:');
    console.log('  POST   /api/clients/:clientId/chat/:domain/message  - Send message');
    console.log('  GET    /api/clients/:clientId/chat/:domain/context  - Get conversation context');
    console.log('');
    console.log('📱 Multi-Client WhatsApp:');
    console.log('  GET    /api/clients/:clientId/whatsapp/qr-code      - Generate QR code');
    console.log('  GET    /api/clients/:clientId/whatsapp/qr-code/html - QR code HTML page');
    console.log('  POST   /api/clients/:clientId/whatsapp/webhook      - WhatsApp webhook');
    console.log('  GET    /api/clients/:clientId/whatsapp/stats        - WhatsApp statistics');
    console.log('');
    console.log('📊 Analytics & Monitoring:');
    console.log('  GET    /api/clients/:clientId/analytics/dashboard   - Client dashboard');
    console.log('  GET    /api/system/health                          - System health');
    console.log('  GET    /api/agents/status                          - Agent status (FIXED)');
    console.log('');
    console.log('🔄 Backward Compatibility (Preserved):');
    console.log('  POST   /api/chat/message                           - Legacy chat endpoint');
    console.log('  GET    /api/whatsapp/qr-code                       - Legacy QR generation');
    console.log('  POST   /api/whatsapp/webhook                       - Legacy webhook');
    console.log('');
  }

  getClientManager(): ClientManager {
    return this.clientManager;
  }

  getVectorStore(): MultiClientVectorStore {
    return this.vectorStore;
  }

  getDatabaseAdapter(): MultiClientDatabaseAdapter {
    return this.databaseAdapter;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Multi-Client Route Integration...');
    
    try {
      await this.clientManager.shutdown();
      await this.databaseAdapter.shutdown();
      await this.vectorStore.shutdown();
      
      this.initialized = false;
      console.log('✅ Multi-Client Route Integration shut down successfully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}