// Multi-Client Management Service - CORRECTED VERSION
// File: backend/src/core/services/ClientManager.ts

import { DomainConfigFactory } from '../config/DomainConfigFactory';
import { CoreAIService } from './CoreAIService';
import { MultiClientDatabaseAdapter } from './MultiClientDatabaseAdapter';
import { MultiClientVectorStore } from './MultiClientVectorStore';
import { ClientConfig, ClientUsage, ClientOnboardingData } from '../types/client-types';

export class ClientManager {
  private clients = new Map<string, ClientConfig>();
  private clientServices = new Map<string, Map<string, CoreAIService>>();
  private usage = new Map<string, ClientUsage>();
  private vectorStore: MultiClientVectorStore;
  private databaseAdapter: MultiClientDatabaseAdapter;

  constructor(
    vectorStore: MultiClientVectorStore,
    databaseAdapter: MultiClientDatabaseAdapter
  ) {
    this.vectorStore = vectorStore;
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Initialize the client manager system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Client Manager...');
    
    // Vector store and database adapter should already be initialized
    // by the RouteIntegration service
    
    // Load existing clients from database/config
    await this.loadExistingClients();
    
    console.log(`Client Manager ready with ${this.clients.size} clients`);
  }

  /**
   * Create and initialize a new client
   */
  async createClient(onboardingData: ClientOnboardingData): Promise<string> {
    const clientId = this.generateClientId(onboardingData.organizationName);
    
    console.log(`Creating new client: ${clientId}`);
    
    try {
      // 1. Create client configuration
      const clientConfig = await this.buildClientConfig(clientId, onboardingData);
      
      // 2. Initialize vector store for client
      await this.vectorStore.initializeClient(clientId, onboardingData.domains);
      
      // 3. Set up database connection
      await this.databaseAdapter.initializeClient(clientId, clientConfig);
      
      // 4. Initialize AI services for each domain
      await this.initializeClientServices(clientConfig);
      
      // 5. Store client configuration
      this.clients.set(clientId, clientConfig);
      
      // 6. Initialize usage tracking
      this.usage.set(clientId, {
        clientId,
        messagesThisDay: 0,
        socialPostsThisDay: 0,
        databaseQueriesThisDay: 0,
        lastResetDate: new Date(),
        totalMessages: 0,
        totalSocialPosts: 0,
        totalQueries: 0
      });
      
      // 7. Persist client data
      await this.persistClientConfig(clientConfig);
      
      console.log(`Client ${clientId} created successfully`);
      return clientId;
      
    } catch (error) {
      console.error(`Failed to create client ${clientId}:`, error);
      
      // Cleanup on failure
      await this.cleanupFailedClient(clientId);
      throw error;
    }
  }

  
  /**
   * Process message for specific client and domain
   */
  async processMessage(
    clientId: string,
    userId: string,
    message: string,
    domain: string,
    contextOverride?: any
  ): Promise<any> {
    // Check usage limits first
    const canSendMessage = await this.checkUsageLimits(clientId, 'message');
    if (!canSendMessage) {
      throw new Error(`Message limit exceeded for client ${clientId}`);
    }

    // Get client configuration
    const clientConfig = this.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Get domain configuration
    await DomainConfigFactory.initialize();
    const domainConfig = DomainConfigFactory.create(domain);
    const customizedConfig = this.customizeDomainForClient(domainConfig, clientConfig);

    // Get AI service for this client and domain
    const aiService = this.getClientService(clientId, domain);
    if (!aiService) {
      throw new Error(`AI service not available for client ${clientId}, domain ${domain}`);
    }

    try {
      // Process the message
      const response = await aiService.processMessage(
        clientId,
        userId,
        message,
        customizedConfig,
        contextOverride
      );

      // Track usage
      await this.trackUsage(clientId, 'message');

      return response;

    } catch (error) {
      console.error(`Error processing message for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Get AI service for specific client and domain
   */
  getClientService(clientId: string, domain: string): CoreAIService | null {
    const clientServices = this.clientServices.get(clientId);
    if (!clientServices) {
      console.warn(`No services found for client: ${clientId}`);
      return null;
    }

    const service = clientServices.get(domain);
    if (!service) {
      console.warn(`No service found for client ${clientId}, domain: ${domain}`);
      return null;
    }

    return service;
  }

  /**
   * Get client configuration
   */
  getClient(clientId: string): ClientConfig | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Get client configuration (alias for backward compatibility)
   */
  getClientConfig(clientId: string): ClientConfig | null {
    return this.getClient(clientId);
  }

  /**
   * Get all clients
   */
  getAllClients(): ClientConfig[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get all available clients (for admin purposes)
   */
  getAvailableClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get total client count
   */
  getTotalClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if client manager is healthy
   */
  isHealthy(): boolean {
    return this.clients.size >= 0; // Basic health check
  }

  /**
   * Get all active conversations for a client
   */
  getClientConversations(clientId: string): Map<string, any> {
    const services = this.clientServices.get(clientId);
    if (!services) {
      return new Map();
    }

    // Get conversations from the first available service
    // In a real implementation, you might want to aggregate across all domains
    const firstService = Array.from(services.values())[0];
    return firstService ? firstService.getClientConversations(clientId) : new Map();
  }

  /**
   * Check if client can perform action based on usage limits
   */
  async checkUsageLimits(clientId: string, actionType: 'message' | 'social' | 'query'): Promise<boolean> {
    const clientConfig = this.clients.get(clientId);
    const usage = this.usage.get(clientId);
    
    if (!clientConfig || !usage) {
      return false;
    }

    // Reset daily counters if needed
    await this.resetDailyUsageIfNeeded(clientId);

    // Check limits with proper null checks
    const limits = clientConfig.limits;
    if (!limits) {
      return true; // No limits set, allow action
    }

    switch (actionType) {
      case 'message':
        return limits.messagesPerDay ? usage.messagesThisDay < limits.messagesPerDay : true;
      case 'social':
        return limits.socialPostsPerDay ? usage.socialPostsThisDay < limits.socialPostsPerDay : true;
      case 'query':
        return limits.databaseQueriesPerDay ? usage.databaseQueriesThisDay < limits.databaseQueriesPerDay : true;
      default:
        return false;
    }
  }

  /**
   * Track usage for billing and limits
   */
  async trackUsage(clientId: string, actionType: 'message' | 'social' | 'query', count: number = 1): Promise<void> {
    const usage = this.usage.get(clientId);
    if (!usage) return;

    switch (actionType) {
      case 'message':
        usage.messagesThisDay += count;
        usage.totalMessages += count;
        break;
      case 'social':
        usage.socialPostsThisDay += count;
        usage.totalSocialPosts += count;
        break;
      case 'query':
        usage.databaseQueriesThisDay += count;
        usage.totalQueries += count;
        break;
    }

    // Persist usage data
    await this.persistUsageData(clientId, usage);
  }

  /**
   * Update client configuration
   */
  async updateClient(clientId: string, updates: Partial<ClientConfig>): Promise<boolean> {
    const existingConfig = this.clients.get(clientId);
    if (!existingConfig) {
      return false;
    }

    try {
      const updatedConfig = { ...existingConfig, ...updates, updatedAt: new Date() };
      
      // Re-initialize services if domains changed
      if (updates.domains && JSON.stringify(updates.domains) !== JSON.stringify(existingConfig.domains)) {
        await this.reinitializeClientServices(clientId, updatedConfig);
      }
      
      // Update stored configuration
      this.clients.set(clientId, updatedConfig);
      await this.persistClientConfig(updatedConfig);
      
      console.log(`Client ${clientId} updated successfully`);
      return true;
      
    } catch (error) {
      console.error(`Failed to update client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Remove client and cleanup all resources
   */
  async removeClient(clientId: string): Promise<boolean> {
    try {
      // 1. Cleanup AI services
      const services = this.clientServices.get(clientId);
      if (services) {
        for (const [domain, service] of services) {
          await service.cleanup();
        }
        this.clientServices.delete(clientId);
      }

      // 2. Cleanup vector store
      await this.vectorStore.cleanupClient(clientId);

      // 3. Cleanup database connections
      await this.databaseAdapter.cleanupClient(clientId);

      // 4. Remove from memory
      this.clients.delete(clientId);
      this.usage.delete(clientId);

      // 5. Remove persisted data
      await this.removePersistedClientData(clientId);

      console.log(`Client ${clientId} removed successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to remove client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Get client analytics and usage statistics
   */
  async getClientAnalytics(clientId: string): Promise<any> {
    const clientConfig = this.clients.get(clientId);
    const usage = this.usage.get(clientId);
    
    if (!clientConfig || !usage) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const limits = clientConfig.limits || {
      messagesPerDay: 1000,
      socialPostsPerDay: 50,
      databaseQueriesPerDay: 200
    };

    return {
      clientId,
      organizationName: clientConfig.organizationName,
      domains: clientConfig.domains,
      usage: {
        today: {
          messages: usage.messagesThisDay,
          socialPosts: usage.socialPostsThisDay,
          queries: usage.databaseQueriesThisDay
        },
        total: {
          messages: usage.totalMessages,
          socialPosts: usage.totalSocialPosts,
          queries: usage.totalQueries
        },
        limits,
        utilizationRates: {
          messages: limits.messagesPerDay ? usage.messagesThisDay / limits.messagesPerDay : 0,
          socialPosts: limits.socialPostsPerDay ? usage.socialPostsThisDay / limits.socialPostsPerDay : 0,
          queries: limits.databaseQueriesPerDay ? usage.databaseQueriesThisDay / limits.databaseQueriesPerDay : 0
        }
      },
      status: this.getClientHealthStatus(clientId),
      lastActivity: this.getLastActivity(clientId),
      createdAt: clientConfig.createdAt,
      updatedAt: clientConfig.updatedAt
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Client Manager...');
    
    const clientIds = Array.from(this.clients.keys());
    
    for (const clientId of clientIds) {
      try {
        const services = this.clientServices.get(clientId);
        if (services) {
          for (const [domain, service] of services) {
            await service.cleanup();
          }
        }
      } catch (error) {
        console.error(`Error cleaning up client ${clientId}:`, error);
      }
    }
    
    this.clients.clear();
    this.clientServices.clear();
    this.usage.clear();
    
    console.log('Client Manager shutdown complete');
  }

  // Private helper methods

  private generateClientId(organizationName?: string): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const prefix = organizationName 
      ? organizationName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
      : 'client';
    return `${prefix}_${timestamp}_${randomStr}`;
  }

  private async buildClientConfig(clientId: string, data: ClientOnboardingData): Promise<ClientConfig> {
    return {
      clientId,
      organizationName: data.organizationName,
      domains: data.domains,
      contactEmail: data.contactEmail || `contact@${data.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, // FIXED: Added missing contactEmail
      
      whatsapp: {
        businessPhoneNumber: data.whatsapp.businessPhoneNumber,
        webhookToken: data.whatsapp.webhookToken || this.generateWebhookToken(),
        qrCodeBranding: {
          companyName: data.organizationName,
          colors: data.whatsapp.qrCodeBranding?.colors || {
            primary: '#25D366',
            secondary: '#128C7E'
          },
          logo: data.whatsapp.qrCodeBranding?.logo
        }
      },
      
      aiConfig: {
        systemPrompt: data.aiConfig?.systemPrompt || `You are a helpful AI assistant for ${data.organizationName}.`,
        fallbackMessage: data.aiConfig?.fallbackMessage || 'I apologize, but I need more details to help you.',
        personality: data.aiConfig?.personality || 'professional'
      },
      
      socialMedia: data.socialMedia || {},
      
      database: data.database,
      
      limits: data.limits || {
        messagesPerDay: 1000,
        socialPostsPerDay: 50,
        databaseQueriesPerDay: 200
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      billingTier: data.billingTier || 'basic'
    };
  }

  private async initializeClientServices(clientConfig: ClientConfig): Promise<void> {
    const { clientId, domains } = clientConfig;
    const services = new Map<string, CoreAIService>();

    for (const domain of domains) {
      try {
        // Create AI service instance for this client and domain
        const aiService = new CoreAIService(this.vectorStore, this.databaseAdapter);
        await aiService.initialize();
        
        services.set(domain, aiService);
        console.log(`Initialized ${domain} service for client ${clientId}`);
        
      } catch (error) {
        console.error(`Failed to initialize ${domain} service for client ${clientId}:`, error);
        throw error;
      }
    }

    this.clientServices.set(clientId, services);
  }

  private customizeDomainForClient(domainConfig: any, clientConfig: ClientConfig): any {
    return {
      ...domainConfig,
      systemPrompt: clientConfig.aiConfig.systemPrompt.includes(clientConfig.organizationName) 
        ? clientConfig.aiConfig.systemPrompt 
        : `${clientConfig.aiConfig.systemPrompt} You represent ${clientConfig.organizationName}.`,
      fallbackMessage: clientConfig.aiConfig.fallbackMessage,
      clientBranding: {
        organizationName: clientConfig.organizationName,
        whatsappNumber: clientConfig.whatsapp.businessPhoneNumber,
        personality: clientConfig.aiConfig.personality
      }
    };
  }

  private async loadExistingClients(): Promise<void> {
    // Load clients from persistent storage (database/file system)
    // Implementation depends on your persistence strategy
    console.log('Loading existing clients...');
    
    // For now, this is a placeholder - implement based on your storage needs
    // Could load from:
    // - Database table
    // - Configuration files
    // - Environment variables
    // - External configuration service
  }

  private async resetDailyUsageIfNeeded(clientId: string): Promise<void> {
    const usage = this.usage.get(clientId);
    if (!usage) return;

    const now = new Date();
    const lastReset = usage.lastResetDate;
    
    // Check if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      
      usage.messagesThisDay = 0;
      usage.socialPostsThisDay = 0;
      usage.databaseQueriesThisDay = 0;
      usage.lastResetDate = now;
      
      await this.persistUsageData(clientId, usage);
    }
  }

  private getClientHealthStatus(clientId: string): 'healthy' | 'warning' | 'critical' {
    const usage = this.usage.get(clientId);
    const config = this.clients.get(clientId);
    
    if (!usage || !config || !config.limits) return 'critical';

    // Calculate utilization rates with null checks
    const messageUtilization = config.limits.messagesPerDay 
      ? usage.messagesThisDay / config.limits.messagesPerDay 
      : 0;
    const socialUtilization = config.limits.socialPostsPerDay 
      ? usage.socialPostsThisDay / config.limits.socialPostsPerDay 
      : 0;
    const queryUtilization = config.limits.databaseQueriesPerDay 
      ? usage.databaseQueriesThisDay / config.limits.databaseQueriesPerDay 
      : 0;

    const maxUtilization = Math.max(messageUtilization, socialUtilization, queryUtilization);

    if (maxUtilization > 0.9) return 'critical';
    if (maxUtilization > 0.7) return 'warning';
    return 'healthy';
  }

  private getLastActivity(clientId: string): Date {
    // Implementation to track last activity
    // For now, return current time - implement proper tracking
    return new Date();
  }

  private generateWebhookToken(): string {
    return `webhook_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async reinitializeClientServices(clientId: string, newConfig: ClientConfig): Promise<void> {
    // Cleanup existing services
    const existingServices = this.clientServices.get(clientId);
    if (existingServices) {
      for (const [domain, service] of existingServices) {
        await service.cleanup();
      }
    }

    // Initialize new services
    await this.initializeClientServices(newConfig);
  }

  private async cleanupFailedClient(clientId: string): Promise<void> {
    try {
      await this.vectorStore.cleanupClient(clientId);
      await this.databaseAdapter.cleanupClient(clientId);
      this.clients.delete(clientId);
      this.usage.delete(clientId);
    } catch (cleanupError) {
      console.error(`Failed to cleanup failed client ${clientId}:`, cleanupError);
    }
  }

  private async persistClientConfig(config: ClientConfig): Promise<void> {
    // Implement persistence based on your storage strategy
    // Could be database, file system, etc.
    console.log(`Persisting config for client ${config.clientId}`);
  }

  private async persistUsageData(clientId: string, usage: ClientUsage): Promise<void> {
    // Implement usage data persistence
    console.log(`Persisting usage data for client ${clientId}`);
  }

  private async removePersistedClientData(clientId: string): Promise<void> {
    // Remove all persisted data for client
    console.log(`Removing persisted data for client ${clientId}`);
  }
}