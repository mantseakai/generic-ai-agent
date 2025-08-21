// Domain Configuration Factory - Central Domain Management
// File: backend/src/core/config/DomainConfigFactory.ts

export interface DomainConfig {
  domain: string;
  defaultStage: string;
  systemPrompt: string;
  fallbackMessage: string;
  entityTypes: string[];
  stageFlow: Record<string, Record<string, string>>;
  analysisInstructions: string;
  responseInstructions: string;
  businessLogicTriggers: string[];
  businessLogicHandlers: Record<string, (params: any, queryParams: any, dbAdapter?: any) => Promise<any>>;
  leadScoringWeights: Record<string, number>;
  leadCaptureThreshold: number;
}

export class DomainConfigFactory {
  private static readonly DOMAIN_CONFIGS: Record<string, DomainConfig> = {};
  private static initialized = false;

  /**
   * Initialize the factory with domain configurations
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing Domain Configuration Factory...');

    // Load domain configurations
    this.DOMAIN_CONFIGS.insurance = await this.loadInsuranceConfig();
    this.DOMAIN_CONFIGS.resort = await this.loadResortConfig();
    this.DOMAIN_CONFIGS.pension = await this.loadPensionConfig();

    this.initialized = true;
    console.log(`Domain Configuration Factory ready with ${Object.keys(this.DOMAIN_CONFIGS).length} domains`);
  }

  /**
   * Get domain configuration by name
   */
  static create(domain: string): DomainConfig {
    if (!this.initialized) {
      throw new Error('DomainConfigFactory not initialized. Call initialize() first.');
    }

    const config = this.DOMAIN_CONFIGS[domain];
    if (!config) {
      throw new Error(
        `Unknown domain: ${domain}. Available domains: ${this.getAvailableDomains().join(', ')}`
      );
    }

    // Return a deep copy to prevent modifications
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Get list of available domains
   */
  static getAvailableDomains(): string[] {
    return Object.keys(this.DOMAIN_CONFIGS);
  }

  /**
   * Check if domain is valid
   */
  static isValidDomain(domain: string): boolean {
    return domain in this.DOMAIN_CONFIGS;
  }

  /**
   * Register new domain configuration
   */
  static registerDomain(domain: string, config: DomainConfig): void {
    this.DOMAIN_CONFIGS[domain] = config;
    console.log(`Registered new domain: ${domain}`);
  }

  /**
   * Get all domain configurations (for admin purposes)
   */
  static getAllConfigs(): Record<string, DomainConfig> {
    return { ...this.DOMAIN_CONFIGS };
  }

  // Private methods to load domain configurations

  private static async loadInsuranceConfig(): Promise<DomainConfig> {
    return {
      domain: 'insurance',
      defaultStage: 'initial_contact',
      systemPrompt: 'You are a knowledgeable, friendly insurance agent in Ghana. Always use accurate company information and provide genuine value. Be conversational and build on previous interactions naturally.',
      fallbackMessage: 'I apologize, but I need a moment to process that. How can I help you with insurance today?',
      
      entityTypes: ['auto', 'health', 'life', 'business', 'property', 'travel'],
      
      stageFlow: {
        'initial_contact': {
          'INFORMATION': 'discovery',
          'PRICE_INQUIRY': 'premium_calculation',
          'READY_TO_BUY': 'closing'
        },
        'discovery': {
          'PRICE_INQUIRY': 'premium_calculation',
          'OBJECTION': 'objection_handling',
          'COMPARISON': 'comparison_mode'
        },
        'premium_calculation': {
          'READY_TO_BUY': 'closing',
          'OBJECTION': 'objection_handling'
        },
        'objection_handling': {
          'INFORMATION': 'discovery',
          'PRICE_INQUIRY': 'premium_calculation',
          'READY_TO_BUY': 'closing'
        }
      },
      
      analysisInstructions: `
        Analyze this insurance customer message for intent, needs, and personality. 
        Pay special attention to purchase readiness and lead qualification signals.
        
        Extract and classify:
        1. Primary Intent: [INTEREST, PRICE_INQUIRY, OBJECTION, INFORMATION, READY_TO_BUY, COMPARISON]
        2. Insurance Type Interest: [auto, health, life, business, property, travel, general]
        3. Urgency Level: [high, medium, low] with reasoning
        4. Budget Signals: [price_sensitive, budget_conscious, value_focused, premium_interested]
        5. Buying Signals: [comparison_shopping, timeline_mentioned, decision_authority, payment_discussion]
      `,
      
      responseInstructions: `
        Provide helpful, accurate insurance information while building rapport.
        Use a consultative approach - ask clarifying questions when needed.
        Always mention specific benefits and value propositions.
        Include relevant coverage details and pricing guidance when appropriate.
      `,
      
      businessLogicTriggers: [
        'premium', 'quote', 'price', 'cost', 'calculate', 'estimate',
        'auto insurance', 'car insurance', 'health insurance', 'life insurance'
      ],
      
      businessLogicHandlers: {
        'calculate_premium': async (params: any, queryParams: any, dbAdapter?: any) => {
          // Premium calculation logic
          return {
            premium: 1200,
            breakdown: {
              base: 800,
              location: 200,
              age: 100,
              coverage: 100
            },
            coverage: 'comprehensive'
          };
        },
        'get_quote': async (params: any, queryParams: any, dbAdapter?: any) => {
          return {
            quoteId: `quote_${Date.now()}`,
            estimatedPremium: 1200,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          };
        }
      },
      
      leadScoringWeights: {
        'price_inquiry': 30,
        'ready_to_buy': 50,
        'timeline_mentioned': 20,
        'budget_discussed': 25,
        'comparison_shopping': 15,
        'objection_handled': 10
      },
      
      leadCaptureThreshold: 70
    };
  }

  private static async loadResortConfig(): Promise<DomainConfig> {
    return {
      domain: 'resort',
      defaultStage: 'initial_contact',
      systemPrompt: 'You are a friendly, welcoming, and knowledgeable guest relations agent for The BigBlue Resort & Spa in Ghana. Your primary goal is to assist users with inquiries about our accommodation, activities, and packages.',
      fallbackMessage: 'I apologize, but I need more details to understand your request. How can I help you enjoy your stay at The BigBlue Resort & Spa?',
      
      entityTypes: ['accommodation', 'activities', 'packages', 'booking', 'contact'],
      
      stageFlow: {
        'initial_contact': {
          'ACCOMMODATION_INQUIRY': 'accommodation_flow',
          'ACTIVITIES_INQUIRY': 'activities_flow',
          'PACKAGE_INQUIRY': 'packages_flow',
          'BOOKING_REQUEST': 'booking_flow',
        },
        'accommodation_flow': {
          'ROOM_DETAILS': 'booking_flow',
        },
        'activities_flow': {
          'ACTIVITY_BOOKING': 'booking_flow',
        },
        'packages_flow': {
          'PACKAGE_DETAILS': 'booking_flow',
        },
        'booking_flow': {
          'CONFIRMATION': 'closing',
          'MISSING_INFO': 'data_collection'
        },
      },
      
      analysisInstructions: `
        Analyze the user's message to determine their intent regarding resort services.
        Identify if they are asking about accommodation types, activities, packages, or booking.
        Extract key parameters like room type, number of guests, dates, or activity names.
      `,
      
      responseInstructions: `
        Provide clear and engaging information about resort services.
        Use descriptive language to entice the user when discussing rooms or activities.
        When asking for more information, be specific about what's needed.
      `,
      
      businessLogicTriggers: [
        'booking', 'reserve', 'availability', 'room', 'suite', 'spa', 'restaurant',
        'activity', 'package', 'rate', 'price'
      ],
      
      businessLogicHandlers: {
        'check_availability': async (params: any, queryParams: any, dbAdapter?: any) => {
          return {
            available: true,
            roomTypes: ['Standard', 'Deluxe', 'Suite'],
            rates: { standard: 200, deluxe: 350, suite: 500 }
          };
        },
        'get_packages': async (params: any, queryParams: any, dbAdapter?: any) => {
          return {
            packages: [
              { name: 'Romantic Getaway', price: 800, duration: '2 nights' },
              { name: 'Family Fun', price: 1200, duration: '3 nights' },
              { name: 'Spa Retreat', price: 1000, duration: '2 nights' }
            ]
          };
        }
      },
      
      leadScoringWeights: {
        'booking_inquiry': 40,
        'dates_mentioned': 30,
        'package_interest': 20,
        'contact_shared': 25
      },
      
      leadCaptureThreshold: 60
    };
  }

  private static async loadPensionConfig(): Promise<DomainConfig> {
    return {
      domain: 'pension',
      defaultStage: 'initial_contact',
      systemPrompt: 'You are a helpful pension and retirement planning advisor specializing in SSNIT and pension services in Ghana. Provide accurate information about pension benefits, contributions, and retirement planning.',
      fallbackMessage: 'I apologize, but I need more details to help you with your pension inquiry.',
      
      entityTypes: ['statement', 'contribution', 'benefit', 'retirement', 'claim'],
      
      stageFlow: {
        'initial_contact': {
          'STATEMENT_REQUEST': 'statement_flow',
          'CONTRIBUTION_INQUIRY': 'contribution_flow',
          'BENEFIT_CALCULATION': 'benefit_flow',
          'RETIREMENT_PLANNING': 'planning_flow'
        },
        'statement_flow': {
          'STATEMENT_DETAILS': 'closing'
        },
        'contribution_flow': {
          'CONTRIBUTION_DETAILS': 'closing'
        },
        'benefit_flow': {
          'BENEFIT_CALCULATION': 'closing'
        },
        'planning_flow': {
          'PLANNING_ADVICE': 'closing'
        }
      },
      
      analysisInstructions: `
        Analyze pension-related inquiries for specific needs:
        1. Statement requests
        2. Contribution inquiries  
        3. Benefit calculations
        4. Retirement planning
        5. Claims assistance
      `,
      
      responseInstructions: `
        Provide accurate pension information with specific details.
        Guide users through processes step-by-step.
        Always mention required documentation when applicable.
      `,
      
      businessLogicTriggers: [
        'statement', 'contribution', 'benefit', 'retirement', 'pension',
        'SSNIT', 'calculate', 'planning'
      ],
      
      businessLogicHandlers: {
        'calculate_benefit': async (params: any, queryParams: any, dbAdapter?: any) => {
          return {
            estimatedMonthlyBenefit: 1500,
            yearsOfService: 30,
            contributionAverage: 500
          };
        },
        'get_statement': async (params: any, queryParams: any, dbAdapter?: any) => {
          return {
            statementAvailable: true,
            lastContribution: '2024-07-01',
            totalContributions: 45000
          };
        }
      },
      
      leadScoringWeights: {
        'statement_request': 20,
        'benefit_inquiry': 30,
        'retirement_planning': 40,
        'personal_info_shared': 25
      },
      
      leadCaptureThreshold: 50
    };
  }
}