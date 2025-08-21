// Client Management Routes - Admin CRUD Operations
// File: backend/src/core/routes/client-management.ts

import { Router, Request, Response } from 'express';
import { ClientManager } from '../services/ClientManager';
import { 
  ClientCreateRequest,
  ClientCreateResponse,
  ClientConfig,
  ClientUpdateRequest,
  ClientListItem,
  ClientOnboardingData
} from '../types/client-types';

export function createClientManagementRoutes(clientManager: ClientManager): Router {
  const router = Router();

  /**
   * POST /api/admin/clients
   * Create a new client (Admin endpoint)
   */
  router.post('/clients', async (req: Request, res: Response) => {
    try {
      const createRequest: ClientCreateRequest = req.body;

      console.log('Creating new client:', createRequest.organizationName);

      // Validate required fields
      if (!createRequest.organizationName || !createRequest.domains) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: organizationName, domains'
        } as ClientCreateResponse);
      }

      // FIXED: Create proper ClientOnboardingData structure
      const onboardingData: ClientOnboardingData = {
        organizationName: createRequest.organizationName,
        contactEmail: createRequest.contactEmail || `contact@${createRequest.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        domains: createRequest.domains,
        // FIXED: whatsapp object structure
        whatsapp: {
          businessPhoneNumber: createRequest.businessPhoneNumber || createRequest.whatsapp?.businessPhoneNumber || '+1234567890',
          webhookToken: `wh_${Math.random().toString(36).substring(2, 15)}`,
          qrCodeBranding: {
            colors: { primary: '#0066cc', secondary: '#f0f0f0' },
            logo: createRequest.organizationName
          }
        },
        database: createRequest.database || {
          type: 'sqlite',
          connectionString: `sqlite://./clients/${createRequest.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '')}.db`
        },
        aiConfig: createRequest.aiConfig || {
          systemPrompt: `You are a helpful AI assistant for ${createRequest.organizationName}.`,
          fallbackMessage: 'I apologize, but I need a moment to process your request. Please try again.',
          personality: 'professional'
        },
        socialMedia: createRequest.socialMedia || {},
        limits: {
          messagesPerDay: 1000,
          socialPostsPerDay: 50,
          databaseQueriesPerDay: 200,
          ...(createRequest.billingTier === 'professional' && {
            messagesPerDay: 5000,
            socialPostsPerDay: 200,
            databaseQueriesPerDay: 1000
          }),
          ...(createRequest.billingTier === 'enterprise' && {
            messagesPerDay: 20000,
            socialPostsPerDay: 1000,
            databaseQueriesPerDay: 5000
          })
        },
        billingTier: createRequest.billingTier || 'basic'
      };

      // Create client
      const clientId = await clientManager.createClient(onboardingData);

      // Generate API credentials
      const apiKey = `ak_${clientId}_${Math.random().toString(36).substring(2, 15)}`;
      const webhookToken = `wh_${clientId}_${Math.random().toString(36).substring(2, 15)}`;

      // Store API credentials (implement secure storage)
      await storeClientCredentials(clientId, { apiKey, webhookToken });

      const response = {
  success: true,
  data: {
    clientId,
    organizationName: onboardingData.organizationName,
    domains: onboardingData.domains,
    apiCredentials: {
      clientId,
      apiKey,
      webhookToken
    },
    endpoints: {
      chat: `/api/clients/${clientId}/chat/{domain}/message`,
      whatsapp: `/api/clients/${clientId}/whatsapp/qr-code`,
      social: `/api/clients/${clientId}/social/post`,
      analytics: `/api/clients/${clientId}/analytics/dashboard`
    }
  }
};

      console.log(`Client created successfully: ${clientId}`);
      res.status(201).json(response);

    } catch (error) {
      console.error('Client creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create client',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ClientCreateResponse);
    }
  });

  /**
   * GET /api/admin/clients
   * List all clients (Admin endpoint)
   */
  router.get('/clients', async (req: Request, res: Response) => {
    try {
      console.log('Listing all clients...');
      
      const allClients = clientManager.getAllClients();
      const clients: ClientListItem[] = [];

      for (const config of allClients) {
        try {
          const analytics = await clientManager.getClientAnalytics(config.clientId);
          
          clients.push({
            clientId: config.clientId,
            organizationName: config.organizationName,
            domains: config.domains,
            status: config.status || 'active',
            billingTier: config.billingTier || 'basic',
            createdAt: config.createdAt || new Date(),
            lastActivity: analytics?.lastActivity || new Date(),
            usageToday: {
              messages: analytics?.usage?.today?.messages || 0,
              socialPosts: analytics?.usage?.today?.socialPosts || 0,
              queries: analytics?.usage?.today?.queries || 0
            },
            health: analytics?.status || 'unknown'
          });
        } catch (error) {
          console.error(`Error getting analytics for client ${config.clientId}:`, error);
          // Continue with partial data
          clients.push({
            clientId: config.clientId,
            organizationName: config.organizationName,
            domains: config.domains,
            status: config.status || 'active',
            billingTier: config.billingTier || 'basic',
            createdAt: config.createdAt || new Date(),
            lastActivity: new Date(),
            usageToday: {
              messages: 0,
              socialPosts: 0,
              queries: 0
            },
            health: 'unknown'
          });
        }
      }

      console.log(`Listed ${clients.length} clients`);
      res.json({
        success: true,
        data: {
          clients,
          totalClients: clients.length
        }
      });

    } catch (error) {
      console.error('List clients error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list clients'
      });
    }
  });

  /**
   * GET /api/admin/clients/:clientId
   * Get specific client details
   */
  router.get('/clients/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const clientConfig = await clientManager.getClient(clientId);
      if (!clientConfig) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      const analytics = await clientManager.getClientAnalytics(clientId);

      res.json({
        success: true,
        data: {
          config: clientConfig,
          analytics
        }
      });

    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client details'
      });
    }
  });

  /**
   * PUT /api/admin/clients/:clientId
   * Update client configuration (Admin endpoint)
   */
  router.put('/clients/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const updates = req.body as Partial<ClientConfig>;

      console.log(`Updating client: ${clientId}`);

      const success = await clientManager.updateClient(clientId, updates);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      console.log(`Client updated: ${clientId}`);
      res.json({
        success: true,
        message: `Client ${clientId} updated successfully`
      });

    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update client'
      });
    }
  });

  /**
   * DELETE /api/admin/clients/:clientId
   * Remove client and cleanup resources (Admin endpoint)
   */
  router.delete('/clients/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      console.log(`Removing client: ${clientId}`);

      const success = await clientManager.removeClient(clientId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      // Remove API credentials
      await removeClientCredentials(clientId);

      console.log(`Client removed: ${clientId}`);
      res.json({
        success: true,
        message: `Client ${clientId} removed successfully`
      });

    } catch (error) {
      console.error('Remove client error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove client'
      });
    }
  });

  return router;
}

// Helper functions for credential management
async function storeClientCredentials(clientId: string, credentials: any): Promise<void> {
  // TODO: Implement secure credential storage (database, encrypted file, etc.)
  console.log(`Storing credentials for client ${clientId}`);
  // For now, just log - in production, store securely
}

async function removeClientCredentials(clientId: string): Promise<void> {
  // TODO: Remove stored credentials from secure storage
  console.log(`Removing credentials for client ${clientId}`);
  // For now, just log - in production, remove from secure storage
}

export default createClientManagementRoutes;