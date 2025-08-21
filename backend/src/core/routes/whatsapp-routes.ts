// Multi-Client WhatsApp Routes - Separate File to Fix Import Issues
// File: backend/src/core/routes/whatsapp-routes.ts

import { Router, Request, Response } from 'express';
import { ClientManager } from '../services/ClientManager';

export function createMultiClientWhatsAppRoutes(clientManager: ClientManager): Router {
  const router = Router();

  /**
   * GET /api/clients/:clientId/whatsapp/qr-code
   * Generate client-specific QR code
   */
  router.get('/:clientId/whatsapp/qr-code', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { type = 'general', size = '300' } = req.query;

      console.log(`Multi-client QR generation: ${clientId} - Type: ${type}`);

      // Validate client exists
      const clientConfig = clientManager.getClientConfig(clientId);
      if (!clientConfig) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      // Validate WhatsApp configuration
      if (!clientConfig.whatsapp || !clientConfig.whatsapp.businessPhoneNumber) {
        return res.status(400).json({
          success: false,
          error: `WhatsApp not configured for client: ${clientId}`
        });
      }

      const qrData = await generateClientQRCode(clientConfig, type as string, size as string);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="whatsapp-qr-${clientId}-${type}.png"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // For now, redirect to Google Charts API - in production, generate actual QR
      const whatsappUrl = generateWhatsAppURL(clientConfig, type as string);
      const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(whatsappUrl)}&choe=UTF-8`;
      
      res.redirect(qrUrl);

    } catch (error) {
      console.error('Multi-client QR generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate client QR code'
      });
    }
  });

  /**
   * GET /api/clients/:clientId/whatsapp/qr-code/html
   * Generate client-specific QR code HTML page
   */
  router.get('/:clientId/whatsapp/qr-code/html', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { type = 'general', size = '300' } = req.query;

      const clientConfig = clientManager.getClientConfig(clientId);
      if (!clientConfig) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      if (!clientConfig.whatsapp || !clientConfig.whatsapp.businessPhoneNumber) {
        return res.status(400).json({
          success: false,
          error: `WhatsApp not configured for client: ${clientId}`
        });
      }

      const html = generateClientQRHTML(clientConfig, type as string, size as string);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      console.error('Multi-client QR HTML error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate client QR HTML'
      });
    }
  });

  /**
   * POST /api/clients/:clientId/whatsapp/webhook
   * Handle client-specific WhatsApp webhooks
   */
  router.post('/:clientId/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const webhookData = req.body;

      console.log(`Multi-client WhatsApp webhook: ${clientId}`);

      const clientConfig = clientManager.getClientConfig(clientId);
      if (!clientConfig) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      // Process webhook data here
      // For now, just acknowledge receipt
      const result = await processClientWebhook(clientId, webhookData, clientManager);

      res.json({
        success: true,
        result
      });

    } catch (error) {
      console.error('Multi-client WhatsApp webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process WhatsApp webhook'
      });
    }
  });

  /**
   * GET /api/clients/:clientId/whatsapp/stats
   * Get WhatsApp statistics for client
   */
  router.get('/:clientId/whatsapp/stats', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const clientConfig = clientManager.getClientConfig(clientId);
      if (!clientConfig) {
        return res.status(404).json({
          success: false,
          error: `Client not found: ${clientId}`
        });
      }

      const stats = {
        clientId,
        organizationName: clientConfig.organizationName,
        whatsappNumber: clientConfig.whatsapp?.businessPhoneNumber || 'Not configured',
        qrCodesGenerated: 0, // This would be tracked in real implementation
        messagesReceived: 0, // This would be tracked in real implementation
        messagesSent: 0, // This would be tracked in real implementation
        domains: clientConfig.domains,
        lastActivity: new Date(),
        status: 'active'
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('WhatsApp stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve WhatsApp statistics'
      });
    }
  });

  return router;
}

// Helper functions

function generateWhatsAppURL(clientConfig: any, type: string): string {
  const phoneNumber = clientConfig.whatsapp.businessPhoneNumber;
  const organizationName = clientConfig.organizationName;
  
  const messageTemplates: Record<string, string> = {
    general: `Hi! I'd like to chat with ${organizationName}. How can you help me today?`,
    insurance: `Hello! I'm interested in learning about your insurance options. Can you help me?`,
    resort: `Hi! I'd like to know about room availability and packages at your resort.`,
    pension: `Hello! I need information about pension benefits and contributions.`,
    support: `Hi! I need some assistance. Can you help me?`
  };

  const message = messageTemplates[type] || messageTemplates.general;
  
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function generateClientQRHTML(clientConfig: any, type: string, size: string): string {
  const { organizationName, whatsapp } = clientConfig;
  const branding = whatsapp.qrCodeBranding || {
    colors: { primary: '#25D366', secondary: '#128C7E' },
    companyName: organizationName
  };

  const whatsappUrl = generateWhatsAppURL(clientConfig, type);
  const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(whatsappUrl)}&choe=UTF-8`;
  const fallbackQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(whatsappUrl)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR Code - ${organizationName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%);
            color: white;
        }
        .qr-container {
            background: white;
            color: #333;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 400px;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: ${branding.colors.primary};
        }
        .subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
        }
        .qr-code {
            margin: 20px 0;
            border: 3px solid ${branding.colors.primary};
            border-radius: 10px;
            display: inline-block;
            padding: 10px;
            background: white;
        }
        .instructions {
            font-size: 14px;
            color: #666;
            margin-top: 20px;
            line-height: 1.5;
        }
        .whatsapp-link {
            display: inline-block;
            background: ${branding.colors.primary};
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            margin-top: 20px;
            font-weight: bold;
        }
        .whatsapp-link:hover {
            background: ${branding.colors.secondary};
            transition: background-color 0.3s;
        }
    </style>
</head>
<body>
    <div class="qr-container">
        <div class="company-name">${organizationName}</div>
        <div class="subtitle">Connect with us on WhatsApp</div>
        
        <div class="qr-code">
            <img src="${qrUrl}" 
                 alt="WhatsApp QR Code" 
                 onerror="this.src='${fallbackQRUrl}'"
                 style="width: ${size}px; height: ${size}px; display: block;">
        </div>
        
        <div class="instructions">
            <strong>How to connect:</strong><br>
            1. Open WhatsApp on your phone<br>
            2. Tap Menu > Settings > QR code<br>
            3. Point your camera at this code<br>
            4. Tap the link that appears
        </div>
        
        <a href="${whatsappUrl}" class="whatsapp-link" target="_blank">
            💬 Open WhatsApp Directly
        </a>
        
        <div style="margin-top: 20px; font-size: 12px; color: #999;">
            Powered by Multi-Client AI Platform
        </div>
    </div>
</body>
</html>`;
}

async function generateClientQRCode(clientConfig: any, type: string, size: string): Promise<any> {
  // This would generate an actual QR code buffer in production
  // For now, we'll use the redirect approach in the route
  return null;
}

async function processClientWebhook(clientId: string, webhookData: any, clientManager: ClientManager): Promise<any> {
  // Process the webhook data here
  // This would include message processing, AI responses, etc.
  console.log(`Processing webhook for client ${clientId}:`, webhookData);
  
  return {
    processed: true,
    timestamp: new Date().toISOString(),
    clientId
  };
}