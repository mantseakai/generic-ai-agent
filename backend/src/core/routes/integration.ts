// File: backend/src/core/routes/integration.ts - FIXED VERSION

import { Express } from 'express';
import { ClientManager } from '../services/ClientManager';
import { MultiClientVectorStore } from '../services/MultiClientVectorStore';
import { MultiClientDatabaseAdapter } from '../services/MultiClientDatabaseAdapter';
import { createClientChatRoutes, createClientManagementRoutes } from './client-chat';

// Import enhanced WhatsApp service
import { createMultiClientWhatsAppRoutes } from '../../enhanced/whatsapp/MultiClientWhatsAppService';

/**
 * Integration service to set up all multi-client routes
 */
export class RouteIntegration {
  private clientManager: ClientManager;
  private vectorStore: MultiClientVectorStore;
  private databaseAdapter: MultiClientDatabaseAdapter;
  private initialized: boolean = false;

  constructor() {
    // Initialize core services
    this.vectorStore = new MultiClientVectorStore();
    this.databaseAdapter = new MultiClientDatabaseAdapter();
    this.clientManager = new ClientManager(this.vectorStore, this.databaseAdapter);
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️  Route integration already initialized');
      return;
    }

    console.log('🚀 Initializing Multi-Client Route Integration...');

    try {
      // Initialize services in correct order
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
   * Setup all multi-client routes on the Express app
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

    // 3. Enhanced WhatsApp Routes (Multi-Client)
    const whatsappRoutes = createMultiClientWhatsAppRoutes(this.clientManager);
    app.use('/api/clients', whatsappRoutes);
    console.log('✅ Multi-client WhatsApp routes: /api/clients/*/whatsapp/*');

    // 4. Analytics and Monitoring Routes
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
        
        // Verify client exists
        const client = await this.clientManager.getClient(clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            error: 'Client not found'
          });
        }

        // Get analytics data
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

    // Client usage metrics
    app.get('/api/clients/:clientId/analytics/usage', async (req, res) => {
      try {
        const { clientId } = req.params;
        const { timeframe = '7d' } = req.query;
        
        const client = await this.clientManager.getClient(clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            error: 'Client not found'
          });
        }

        const usage = await this.getClientUsage(clientId, timeframe as string);
        
        res.json({
          success: true,
          data: usage
        });

      } catch (error) {
        console.error('Error getting usage metrics:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get usage metrics'
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
          error: 'Health check failed'
        });
      }
    });
  }

  /**
   * Get system health status - PUBLIC METHOD
   */
  async getSystemHealth(): Promise<any> {
    const health = {
      status: 'healthy',
      services: {
        vectorStore: await this.vectorStore.healthCheck(),
        databaseAdapter: await this.databaseAdapter.healthCheck(),
        clientManager: this.clientManager.isHealthy()
      },
      metrics: {
        totalClients: this.clientManager.getTotalClientCount(),
        activeConnections: this.getActiveConnections(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };

    return health;
  }

  /**
   * Generate analytics for a specific client
   */
  private async generateClientAnalytics(clientId: string): Promise<any> {
    // Get active conversations
    const conversations = this.clientManager.getClientConversations(clientId);
    
    const analytics = {
      overview: {
        totalConversations: conversations.size,
        activeUsers: conversations.size,
        averageLeadScore: this.calculateAverageLeadScore(conversations),
        highQualityLeads: this.countHighQualityLeads(conversations)
      },
      usage: {
        messagesThisWeek: await this.getMessageCount(clientId, '7d'),
        whatsappSessions: await this.getWhatsAppSessions(clientId, '7d'),
        socialMediaPosts: await this.getSocialMediaActivity(clientId, '7d')
      },
      performance: {
        averageResponseTime: '< 1s', // This would be calculated from actual metrics
        uptime: '99.9%', // This would be calculated from actual monitoring
        satisfactionScore: 4.5 // This would come from user feedback
      },
      domains: await this.getDomainUsage(clientId),
      topQueries: await this.getTopQueries(clientId, '30d'),
      timestamp: new Date().toISOString()
    };

    return analytics;
  }

  /**
   * Get client usage metrics
   */
  private async getClientUsage(clientId: string, timeframe: string): Promise<any> {
    // This would integrate with actual metrics collection
    return {
      timeframe,
      messages: {
        total: 150,
        byDomain: {
          insurance: 80,
          resort: 45,
          pension: 25
        }
      },
      whatsapp: {
        qrCodeScans: 25,
        activeChats: 12,
        completedSessions: 8
      },
      socialMedia: {
        posts: 5,
        engagement: {
          likes: 45,
          shares: 12,
          comments: 8
        }
      }
    };
  }

  // Helper methods for analytics
  private calculateAverageLeadScore(conversations: Map<string, any>): number {
    if (conversations.size === 0) return 0;
    
    let totalScore = 0;
    conversations.forEach(conv => {
      totalScore += conv.leadScore || 0;
    });
    
    return totalScore / conversations.size;
  }

  private countHighQualityLeads(conversations: Map<string, any>): number {
    let count = 0;
    conversations.forEach(conv => {
      if (conv.leadScore >= 7.0) count++;
    });
    return count;
  }

  private async getMessageCount(clientId: string, timeframe: string): Promise<number> {
    // This would query actual message logs
    return 150; // Placeholder
  }

  private async getWhatsAppSessions(clientId: string, timeframe: string): Promise<number> {
    // This would query WhatsApp session logs
    return 25; // Placeholder
  }

  private async getSocialMediaActivity(clientId: string, timeframe: string): Promise<number> {
    // This would query social media post logs
    return 5; // Placeholder
  }

  private async getDomainUsage(clientId: string): Promise<any> {
    // This would analyze domain-specific usage
    return {
      insurance: { messages: 80, satisfaction: 4.2 },
      resort: { messages: 45, satisfaction: 4.7 },
      pension: { messages: 25, satisfaction: 4.1 }
    };
  }

  private async getTopQueries(clientId: string, timeframe: string): Promise<string[]> {
    // This would analyze most common queries
    return [
      'What insurance do you offer?',
      'How much does car insurance cost?',
      'Room availability at resort',
      'Pension benefit calculation',
      'How to file a claim'
    ];
  }

  private getActiveConnections(): number {
    // This would count actual active connections
    return 45; // Placeholder
  }

  /**
   * Log all available endpoints for debugging
   */
  private logAvailableEndpoints(): void {
    console.log('\n📋 Available Multi-Client Endpoints:');
    console.log('');
    console.log('🔧 Admin/Management:');
    console.log('  POST   /api/admin/clients                    - Create new client');
    console.log('  GET    /api/admin/clients                    - List all clients');
    console.log('  GET    /api/admin/clients/:clientId          - Get client details');
    console.log('  PUT    /api/admin/clients/:clientId          - Update client');
    console.log('  DELETE /api/admin/clients/:clientId          - Remove client');
    console.log('');
    console.log('💬 Multi-Client Chat:');
    console.log('  POST   /api/clients/:clientId/chat/:domain/message  - Send message');
    console.log('  GET    /api/clients/:clientId/chat/:domain/context  - Get conversation context');
    console.log('');
    console.log('📱 Multi-Client WhatsApp:');
    console.log('  GET    /api/clients/:clientId/whatsapp/qr-code      - Generate QR code');
    console.log('  GET    /api/clients/:clientId/whatsapp/qr-code/html - QR code HTML page');
    console.log('  POST   /api/clients/:clientId/whatsapp/webhook      - WhatsApp webhook');
    console.log('');
    console.log('📊 Analytics & Monitoring:');
    console.log('  GET    /api/clients/:clientId/analytics/dashboard   - Client dashboard');
    console.log('  GET    /api/clients/:clientId/analytics/usage       - Usage metrics');
    console.log('  GET    /api/system/health                          - System health');
    console.log('');
    console.log('🔄 Backward Compatibility (Preserved):');
    console.log('  POST   /api/chat/message                           - Legacy chat endpoint');
    console.log('  GET    /api/whatsapp/qr-code                       - Legacy QR generation');
    console.log('  GET    /api/whatsapp/qr-code/html                  - Legacy QR HTML');
    console.log('  POST   /api/whatsapp/webhook                       - Legacy webhook');
    console.log('');
  }

  /**
   * Get the ClientManager instance (for external use)
   */
  getClientManager(): ClientManager {
    return this.clientManager;
  }

  /**
   * Get the VectorStore instance (for external use)
   */
  getVectorStore(): MultiClientVectorStore {
    return this.vectorStore;
  }

  /**
   * Get the DatabaseAdapter instance (for external use)
   */
  getDatabaseAdapter(): MultiClientDatabaseAdapter {
    return this.databaseAdapter;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Multi-Client Route Integration...');
    
    try {
      // Cleanup conversations and connections
      await this.clientManager.shutdown();
      
      // Close database connections
      await this.databaseAdapter.shutdown();
      
      // Cleanup vector store
      await this.vectorStore.shutdown();
      
      this.initialized = false;
      console.log('✅ Multi-Client Route Integration shut down successfully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}