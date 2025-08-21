// Enhanced Multi-Client WhatsApp Service (Preserves Existing System) - CORRECTED VERSION
// File: backend/src/enhanced/whatsapp/MultiClientWhatsAppService.ts

import { ClientManager } from '../../core/services/ClientManager';
import { DomainConfigFactory } from '../../core/config/DomainConfigFactory';

export class MultiClientWhatsAppService {
  private clientManager: ClientManager;

  constructor(clientManager: ClientManager) {
    this.clientManager = clientManager;
  }

  /**
   * Enhanced QR code generation with client-specific branding
   */
  async generateClientQR(clientId: string, type: string, size: string = '300'): Promise<Buffer> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const { whatsapp } = clientConfig;
    const businessPhoneNumber = whatsapp.businessPhoneNumber;
    const branding = whatsapp.qrCodeBranding;

    const messageTemplates = this.getClientMessageTemplates(clientId, type);
    const message = messageTemplates[type] || messageTemplates.general;
    
    const whatsappUrl = `https://wa.me/${businessPhoneNumber}?text=${encodeURIComponent(message)}`;

    return await this.generateBrandedQR(whatsappUrl, size, branding);
  }

  /**
   * Generate client-specific branded QR HTML page
   */
  async generateClientQRHTML(clientId: string, type: string, size: string = '300'): Promise<string> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const { organizationName, whatsapp } = clientConfig;
    const branding = whatsapp.qrCodeBranding;

    const messageTemplates = this.getClientMessageTemplates(clientId, type);
    const message = messageTemplates[type] || messageTemplates.general;
    const whatsappUrl = `https://wa.me/${whatsapp.businessPhoneNumber}?text=${encodeURIComponent(message)}`;

    const primaryQRUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(whatsappUrl)}&choe=UTF-8`;
    const fallbackQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(whatsappUrl)}`;

    const html = `
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
            padding: 2rem;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
        }
        .company-logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 1rem;
        }
        .qr-code {
            margin: 1.5rem 0;
            border-radius: 15px;
            overflow: hidden;
            background: #f8f9fa;
            padding: 1rem;
            border: 2px solid #e9ecef;
        }
        .qr-code img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        .header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            color: ${branding.colors.primary};
        }
        .instructions {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 10px;
            margin-top: 1rem;
            border-left: 4px solid ${branding.colors.primary};
        }
        .direct-link {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: ${branding.colors.primary};
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="qr-container">
        <div class="header">
            ${branding.logo ? `<img src="${branding.logo}" alt="${organizationName}" class="company-logo">` : ''}
            <h1>${organizationName}</h1>
            <p>Scan to start WhatsApp conversation</p>
        </div>
        
        <div class="qr-code">
            <img 
                id="qr-image" 
                src="${primaryQRUrl}" 
                alt="WhatsApp QR Code"
                data-fallback="${fallbackQRUrl}"
            >
        </div>
        
        <div class="instructions">
            <h3>How to use:</h3>
            <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Tap the camera icon or menu</li>
                <li>Point your camera at this QR code</li>
                <li>Start chatting with us!</li>
            </ol>
        </div>
        
        <a href="${whatsappUrl}" class="direct-link" target="_blank">
            Open WhatsApp Directly
        </a>
        
        <div class="footer">
            Type: ${this.formatTypeName(type)} | ${organizationName}
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const qrImage = document.getElementById('qr-image');
            
            qrImage.addEventListener('error', function() {
                const fallbackUrl = this.getAttribute('data-fallback');
                if (fallbackUrl && this.src !== fallbackUrl) {
                    this.src = fallbackUrl;
                }
            });
        });
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Handle client-specific WhatsApp webhook
   */
  async handleClientWebhook(clientId: string, webhookData: any): Promise<any> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (webhookData.token !== clientConfig.whatsapp.webhookToken) {
      throw new Error('Invalid webhook token');
    }

    return await this.processClientWhatsAppMessage(clientId, webhookData);
  }

  /**
   * Get client-specific message templates
   */
  private getClientMessageTemplates(clientId: string, type: string): Record<string, string> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const orgName = clientConfig.organizationName;
    const domains = clientConfig.domains;

    const templates: Record<string, string> = {
      general: `Hello! I'm interested in learning about ${orgName}'s services.`,
      insurance: `Hi! I need information about insurance from ${orgName}.`,
      resort: `Hello! I'd like to know about ${orgName}'s resort services.`,
      pension: `Hi! I have questions about pension services from ${orgName}.`,
      auto: `Hi! I need information about car insurance from ${orgName}.`,
      health: `Hello! I'd like to know about health insurance plans from ${orgName}.`,
      business: `Hello! I need business insurance information from ${orgName}.`,
      quote: `Hi! I'd like to get an insurance quote from ${orgName}.`,
      accommodation: `Hello! I'd like to book accommodation with ${orgName}.`,
      activities: `Hi! I want to know about activities at ${orgName}.`,
      spa: `Hello! I'm interested in spa services at ${orgName}.`,
      statement: `Hi! I'd like to request my pension statement from ${orgName}.`,
      benefit: `Hello! Can ${orgName} help me calculate my estimated pension benefit?`,
      contribution: `Hi! I need to know about my contribution history with ${orgName}.`
    };

    // Add domain-specific templates
    if (domains.includes('insurance')) {
      templates.auto_insurance = `Hi! I need car insurance information from ${orgName}.`;
      templates.health_insurance = `Hello! I'd like health insurance details from ${orgName}.`;
      templates.life_insurance = `Hi! I'm interested in life insurance from ${orgName}.`;
      templates.business_insurance = `Hello! I need business insurance from ${orgName}.`;
    }

    if (domains.includes('resort')) {
      templates.room_booking = `Hello! I'd like to book a room at ${orgName}.`;
      templates.spa_booking = `Hi! I want to book spa services at ${orgName}.`;
      templates.restaurant = `Hello! I'd like restaurant information at ${orgName}.`;
    }

    if (domains.includes('pension')) {
      templates.pension_statement = `Hi! I'd like my pension statement from ${orgName}.`;
      templates.retirement_planning = `Hello! I need retirement planning help from ${orgName}.`;
      templates.contribution_history = `Hi! I want my contribution history from ${orgName}.`;
      templates.benefit_calculation = `Hello! Can ${orgName} calculate my pension benefits?`;
    }

    return templates;
  }

  /**
   * Generate branded QR code
   */
  private async generateBrandedQR(whatsappUrl: string, size: string, branding: any): Promise<Buffer> {
    try {
      const qrApiUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(whatsappUrl)}&choe=UTF-8`;
      
      const response = await fetch(qrApiUrl);
      
      if (!response.ok) {
        throw new Error(`QR API returned status ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());

    } catch (error) {
      console.error('Primary QR generation failed, trying fallback:', error);
      
      try {
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(whatsappUrl)}`;
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (!fallbackResponse.ok) {
          throw new Error('Fallback QR generation also failed');
        }

        return Buffer.from(await fallbackResponse.arrayBuffer());

      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
        return this.generatePlaceholderQR(size);
      }
    }
  }

  /**
   * Process client-specific WhatsApp message - FIXED METHOD SIGNATURE
   */
  private async processClientWhatsAppMessage(clientId: string, webhookData: any): Promise<any> {
    try {
      const message = webhookData.message;
      const phoneNumber = webhookData.from;
      
      const domain = this.detectDomainFromMessage(clientId, message) || 'insurance';
      
      // FIXED: Use the ClientManager.processMessage method with correct signature
      const response = await this.clientManager.processMessage(
        clientId,
        phoneNumber,
        message,
        domain,
        {
          source: 'whatsapp',
          clientId,
          domain
        }
      );

      await this.sendWhatsAppMessage(clientId, phoneNumber, response.message);
      await this.handleDomainSpecificFollowUp(clientId, domain, phoneNumber, response);

      return {
        success: true,
        clientId,
        domain,
        processed: true
      };

    } catch (error) {
      console.error(`WhatsApp message processing failed for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Detect domain from message content - FIXED TYPE INDEXING
   */
  private detectDomainFromMessage(clientId: string, message: string): string | null {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) return null;

    const messageLower = message.toLowerCase();
    const availableDomains = clientConfig.domains;

    // FIXED: Properly typed domain keywords
    const domainKeywords: Record<string, string[]> = {
      insurance: ['insurance', 'policy', 'premium', 'claim', 'coverage', 'deductible'],
      resort: ['room', 'booking', 'accommodation', 'spa', 'hotel', 'vacation', 'stay'],
      pension: ['pension', 'retirement', 'SSNIT', 'contribution', 'benefit', 'statement']
    };

    let bestDomain = null;
    let maxScore = 0;

    for (const domain of availableDomains) {
      const keywords = domainKeywords[domain] || [];
      // FIXED: Properly typed reduce function
      const score = keywords.reduce((acc: number, keyword: string) => 
        acc + (messageLower.includes(keyword) ? 1 : 0), 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain;
      }
    }

    return bestDomain;
  }

  /**
   * Send WhatsApp message to client's phone number
   */
  private async sendWhatsAppMessage(clientId: string, phoneNumber: string, message: string): Promise<void> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    try {
      console.log(`Sending WhatsApp message for client ${clientId} to ${phoneNumber}: ${message.substring(0, 50)}...`);
      // Implementation depends on your WhatsApp API setup
      
    } catch (error) {
      console.error(`Failed to send WhatsApp message for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Handle domain-specific follow-up messages
   */
  private async handleDomainSpecificFollowUp(clientId: string, domain: string, phoneNumber: string, aiResponse: any): Promise<void> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) return;

    const templates = this.getDomainSpecificTemplates(clientConfig.organizationName, domain);
    
    if (aiResponse.followUpQuestions && aiResponse.followUpQuestions.length > 0) {
      const followUpText = `\n\nQuick questions to help you better:\n${aiResponse.followUpQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      
      setTimeout(async () => {
        await this.sendWhatsAppMessage(clientId, phoneNumber, followUpText);
      }, 1000);
    }

    if (aiResponse.nextAction === 'provide_pricing' || aiResponse.nextAction === 'calculate_premium') {
      setTimeout(async () => {
        await this.sendWhatsAppMessage(clientId, phoneNumber, templates.quote);
      }, 2000);
    }

    if (aiResponse.shouldCaptureLead) {
      setTimeout(async () => {
        await this.sendWhatsAppMessage(clientId, phoneNumber, templates.leadCapture);
      }, 3000);
    }
  }

  /**
   * Get domain-specific message templates - FIXED TYPE INDEXING
   */
  private getDomainSpecificTemplates(organizationName: string, domain: string): Record<string, string> {
    const allTemplates: Record<string, Record<string, string>> = {
      insurance: {
        welcome: `Welcome to ${organizationName}! I'm here to help with all your insurance needs. What type of coverage are you looking for?`,
        quote: `I can help you get a personalized quote! What's your preferred coverage level and budget range?`,
        leadCapture: `I'd love to provide you with detailed information. Could you share your contact details so our expert can reach out?`,
        followUp: `Thank you for your interest! Our insurance specialist will contact you within 24 hours with personalized options.`
      },
      resort: {
        welcome: `Welcome to ${organizationName}! I can help you with room bookings, activities, and spa services. What would you like to know?`,
        quote: `I can recommend the perfect package for your stay! What dates are you considering and how many guests?`,
        leadCapture: `I'd be happy to check availability and send you detailed information. May I have your preferred dates and contact details?`,
        followUp: `Thank you for choosing ${organizationName}! Our guest services team will contact you to finalize your booking.`
      },
      pension: {
        welcome: `Welcome to ${organizationName} pension services! I can help with statements, contributions, and retirement planning. How can I assist you?`,
        quote: `I can help calculate your estimated benefits! Could you provide your years of service and current contribution level?`,
        leadCapture: `I'd like to provide you with detailed pension information. Could you share your member number or contact details?`,
        followUp: `Thank you for reaching out! Our pension advisor will contact you within 2 business days with your information.`
      }
    };

    return allTemplates[domain] || allTemplates.insurance;
  }

  /**
   * Generate placeholder QR code when all services fail
   */
  private generatePlaceholderQR(size: string): Buffer {
    const svgSize = parseInt(size) || 300;
    const svgPlaceholder = `
      <svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${svgSize}" height="${svgSize}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        <text x="${svgSize/2}" y="${svgSize/2 - 20}" text-anchor="middle" font-family="Arial" font-size="16" fill="#6c757d">QR Code</text>
        <text x="${svgSize/2}" y="${svgSize/2}" text-anchor="middle" font-family="Arial" font-size="16" fill="#6c757d">Unavailable</text>
        <text x="${svgSize/2}" y="${svgSize/2 + 20}" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Use direct link below</text>
      </svg>
    `;
    
    return Buffer.from(svgPlaceholder);
  }

  /**
   * Format type name for display - FIXED TYPE INDEXING
   */
  private formatTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      general: 'General Inquiry',
      insurance: 'Insurance Services',
      resort: 'Resort Services',
      pension: 'Pension Services',
      auto: 'Auto Insurance',
      health: 'Health Insurance',
      business: 'Business Insurance',
      quote: 'Quote Request',
      accommodation: 'Accommodation Booking',
      activities: 'Activities Information',
      spa: 'Spa Services',
      statement: 'Pension Statement',
      benefit: 'Benefit Calculation',
      contribution: 'Contribution History'
    };

    return typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  }

  /**
   * Validate client access to WhatsApp features
   */
  validateClientAccess(clientId: string): boolean {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      return false;
    }

    return !!(clientConfig.whatsapp && clientConfig.whatsapp.businessPhoneNumber);
  }

  /**
   * Get client WhatsApp statistics
   */
  async getClientWhatsAppStats(clientId: string): Promise<any> {
    const clientConfig = this.clientManager.getClientConfig(clientId);
    if (!clientConfig) {
      throw new Error(`Client not found: ${clientId}`);
    }

    return {
      clientId,
      organizationName: clientConfig.organizationName,
      whatsappNumber: clientConfig.whatsapp.businessPhoneNumber,
      qrCodesGenerated: 0,
      messagesReceived: 0,
      messagesSent: 0,
      domains: clientConfig.domains,
      lastActivity: new Date(),
      status: 'active'
    };
  }
}

// Multi-Client WhatsApp Routes
import { Router, Request, Response } from 'express';

export function createMultiClientWhatsAppRoutes(clientManager: ClientManager): Router {
  const router = Router();
  const whatsappService = new MultiClientWhatsAppService(clientManager);

  /**
   * GET /api/clients/:clientId/whatsapp/qr-code
   */
  router.get('/:clientId/whatsapp/qr-code', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { type = 'general', size = '300' } = req.query;

      console.log(`Multi-client QR generation: ${clientId} - Type: ${type}`);

      if (!whatsappService.validateClientAccess(clientId)) {
        return res.status(404).json({
          success: false,
          error: `Client not found or WhatsApp not configured: ${clientId}`
        });
      }

      const qrBuffer = await whatsappService.generateClientQR(
        clientId,
        type as string,
        size as string
      );

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="whatsapp-qr-${clientId}-${type}.png"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      res.send(qrBuffer);

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
   */
  router.get('/:clientId/whatsapp/qr-code/html', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { type = 'general', size = '300' } = req.query;

      if (!whatsappService.validateClientAccess(clientId)) {
        return res.status(404).json({
          success: false,
          error: `Client not found or WhatsApp not configured: ${clientId}`
        });
      }

      const html = await whatsappService.generateClientQRHTML(
        clientId,
        type as string,
        size as string
      );

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
   */
  router.post('/:clientId/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const webhookData = req.body;

      console.log(`Multi-client WhatsApp webhook: ${clientId}`);

      const result = await whatsappService.handleClientWebhook(clientId, webhookData);

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
   */
  router.get('/:clientId/whatsapp/stats', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const stats = await whatsappService.getClientWhatsAppStats(clientId);

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