// Insurance-Specific AI Service
// File: src/domains/insurance/services/InsuranceAIService.ts
// Contains extracted insurance logic from GenericAIService

import { AIService } from '../../../services/AIService';
import { DomainConfig } from '../../../types/domain';
import { ClientConfig } from '../../../core/types/client-types';
import { 
  InsuranceCustomerProfile, 
  InsuranceConversationContext,
  InsurancePremiumCalculator,
  InsurancePremiumRequest 
} from '../types';

export class InsuranceAIService extends AIService {
  private premiumCalculator: InsurancePremiumCalculator;

  constructor(domainConfig: DomainConfig, clientConfig?: ClientConfig) {
    super(domainConfig, clientConfig);
    this.premiumCalculator = new InsurancePremiumCalculator();
  }

  // Extracted insurance-specific methods


  /**
   * Insurance-specific message processing
   */
  async processInsuranceMessage(
    userId: string,
    message: string,
    context?: Partial<InsuranceConversationContext>
  ) {
    // Enhanced processing for insurance domain
    const response = await this.processMessage(userId, message, context);
    
    // Add insurance-specific enhancements
    if (context?.insuranceSpecific?.productType) {
      response.domainSpecific = {
        insuranceType: context.insuranceSpecific.productType,
        riskAssessmentComplete: context.insuranceSpecific.riskAssessmentComplete,
        quotesGenerated: context.insuranceSpecific.previousQuotes.length
      };
    }
    
    return response;
  }

  /**
   * Generate insurance premium quote
   */
  async generatePremiumQuote(request: InsurancePremiumRequest) {
    return this.premiumCalculator.calculatePremium(request);
  }
}