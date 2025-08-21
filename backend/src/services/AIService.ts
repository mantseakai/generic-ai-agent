// Consolidated AIService - Phase 2 Component 1
// File: backend/src/services/AIService.ts
// This replaces: GenericAIService, EnhancedAIService, CleanGenericAIService, GenericAIServiceWrapper

import OpenAI from 'openai';
import { DomainConfig } from '../types/domain';
import { ClientConfig } from '../core/types/client-types';

// Core interfaces for the consolidated service
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ConversationContext {
  domain: string;
  stage: string;
  entityType?: string;
  customerInfo: Record<string, any>;
  businessLogic?: Record<string, any>;
  conversationHistory: ConversationMessage[];
  clientId?: string;
  [key: string]: any;
}

// Define interfaces for domain-specific data
interface InsuranceDomainSpecificData {
  insuranceType: string;
  riskAssessmentComplete: boolean;
  quotesGenerated: number;
}

interface ResortDomainSpecificData {
  bookingStage: string;
  roomPreferences: string[];
  activityInterests: string[];
}

interface AIResponse {
  message: string;
  confidence: number;
  leadScore: number;
  shouldCaptureLead: boolean;
  nextAction: string;
  context: ConversationContext;
  businessResult?: any;
  followUpQuestions?: string[];
  premiumQuote?: any;
  recommendations?: any[];
  usedKnowledge?: any;
  nextState?: string;

  domainSpecific?: InsuranceDomainSpecificData | ResortDomainSpecificData | any; // Use a union type

}

interface QueryOptions {
  useRAG?: boolean;
  includeHistory?: boolean;
  maxHistoryLength?: number;
  temperature?: number;
  maxTokens?: number;
}

interface BusinessLogicResult {
  type: string;
  data: any;
  confidence: number;
  needsFollowUp: boolean;
}

/**
 * Consolidated AI Service for Multi-Domain, Multi-Client Platform
 * 
 * This service combines all previous AI service functionality:
 * - Generic domain processing (insurance, resort, pension)
 * - Multi-client support with isolation
 * - RAG integration
 * - Business logic processing (premium calculations, bookings, etc.)
 * - Conversation management
 * - Lead scoring and capture
 */
export class AIService {
  private openai: OpenAI;
  private domainConfig: DomainConfig;
  private clientConfig?: ClientConfig;
  private conversations: Map<string, ConversationContext> = new Map();
  private ragService?: any; // Will be injected
  private databaseAdapter?: any; // Will be injected
  private vectorStore?: any; // Will be injected
  private businessLogicHandlers: Map<string, Function> = new Map();
  private initialized: boolean = false;

  constructor(
    domainConfig: DomainConfig,
    clientConfig?: ClientConfig,
    dependencies?: {
      ragService?: any;
      databaseAdapter?: any;
      vectorStore?: any;
    }
  ) {
    this.domainConfig = domainConfig;
    this.clientConfig = clientConfig;
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });

    // Inject dependencies if provided
    if (dependencies) {
      this.ragService = dependencies.ragService;
      this.databaseAdapter = dependencies.databaseAdapter;
      this.vectorStore = dependencies.vectorStore;
    }

    this.setupBusinessLogicHandlers();
  }

  /**
   * Initialize the consolidated AI service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`Initializing AI Service for domain: ${this.domainConfig.domain}${this.clientConfig ? ` (Client: ${this.clientConfig.clientId})` : ''}`);

    try {
      // Initialize dependencies if available
      if (this.ragService && typeof this.ragService.initialize === 'function') {
        await this.ragService.initialize();
        console.log('RAG Service initialized');
      }

      if (this.databaseAdapter && typeof this.databaseAdapter.initialize === 'function') {
        await this.databaseAdapter.initialize();
        console.log('Database adapter initialized');
      }

      if (this.vectorStore && typeof this.vectorStore.initialize === 'function') {
        await this.vectorStore.initialize();
        console.log('Vector store initialized');
      }

      this.initialized = true;
      console.log('AI Service ready');
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Main message processing method - handles all conversation types
   */
  async processMessage(
    userId: string,
    message: string,
    contextOverride?: Partial<ConversationContext>,
    options: QueryOptions = {}
  ): Promise<AIResponse> {
    try {
      await this.initialize();

      // Get or create conversation context
      const context = this.getOrCreateConversation(userId, contextOverride);
      
      // Add user message to history
      this.addMessageToHistory(context, 'user', message);

      // Analyze the user input
      const analysis = await this.analyzeUserInput(message, context);

      // Check if this requires business logic processing
      if (analysis.requiresBusinessLogic) {
        const businessResult = await this.processBusinessLogic(message, context, analysis);
        if (businessResult) {
          return this.createResponseWithBusinessLogic(message, context, analysis, businessResult);
        }
      }

      // Query knowledge base if RAG is available and enabled
      let knowledge = null;
      if (options.useRAG !== false && this.ragService) {
        knowledge = await this.queryKnowledge(message, context);
      }

      // Generate AI response
      const response = await this.generateResponse(message, context, analysis, knowledge, options);

      // Add assistant response to history
      this.addMessageToHistory(context, 'assistant', response.message);

      // Calculate lead score
      const leadScore = this.calculateLeadScore(analysis, context);
      const shouldCaptureLead = leadScore >= (this.domainConfig.leadCaptureThreshold || 70);

      // Update conversation state
      this.updateConversationState(context, analysis);

      return {
        message: response.message,
        confidence: response.confidence,
        leadScore,
        shouldCaptureLead,
        nextAction: analysis.nextBestAction || 'continue',
        context,
        businessResult: response.businessResult,
        followUpQuestions: response.followUpQuestions,
        usedKnowledge: knowledge,
        nextState: context.stage
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return this.createErrorResponse(userId, message, error);
    }
  }

  /**
   * Analyze user input to determine intent and requirements
   */
  private async analyzeUserInput(message: string, context: ConversationContext): Promise<any> {
    try {
      const systemPrompt = this.buildAnalysisPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch {
        // Fallback if JSON parsing fails
        return this.createDefaultAnalysis(message, context);
      }
    } catch (error) {
      console.error('Error analyzing user input:', error);
      return this.createDefaultAnalysis(message, context);
    }
  }

  /**
   * Build domain-specific analysis prompt
   */
  private buildAnalysisPrompt(context: ConversationContext): string {
    const basePrompt = `You are analyzing user messages for a ${context.domain} domain AI assistant.`;
    
    let domainSpecificInstructions = '';
    
    switch (context.domain) {
      case 'insurance':
        domainSpecificInstructions = `
Analyze for:
- Insurance type interest (auto, health, life, business)
- Quote request indicators
- Risk factors mentioned
- Urgency levels
- Personal information sharing willingness
`;
        break;
      case 'resort':
        domainSpecificInstructions = `
Analyze for:
- Booking intentions
- Date preferences
- Group size
- Budget indicators
- Activity interests
- Urgency of travel plans
`;
        break;
      case 'pension':
        domainSpecificInstructions = `
Analyze for:
- Retirement planning stage
- SSNIT-related questions
- Benefit calculation requests
- Documentation needs
- Urgency of information needed
`;
        break;
      default:
        domainSpecificInstructions = `
Analyze for:
- Primary intent
- Information seeking vs. action intent
- Urgency indicators
- Personal information sharing
`;
    }

    return `${basePrompt}

${domainSpecificInstructions}

Return a JSON object with:
{
  "primaryIntent": "INFORMATION|QUOTE|BOOKING|CALCULATION|COMPLAINT|OTHER",
  "entityType": "specific product/service type",
  "urgencyLevel": "low|medium|high|urgent",
  "emotionalState": "neutral|excited|frustrated|confused|satisfied",
  "requiresBusinessLogic": boolean,
  "requiresDatabaseQuery": boolean,
  "leadReadiness": "exploring|interested|ready|qualified",
  "nextBestAction": "provide_info|gather_details|calculate|book|escalate",
  "confidence": 0.0-1.0,
  "extractedEntities": {},
  "followUpNeeded": boolean
}`;
  }

  /**
   * Process business logic based on domain and analysis
   */
  private async processBusinessLogic(
    message: string,
    context: ConversationContext,
    analysis: any
  ): Promise<BusinessLogicResult | null> {
    const handlerKey = `${context.domain}_${analysis.primaryIntent}`;
    const handler = this.businessLogicHandlers.get(handlerKey);
    
    if (handler) {
      try {
        return await handler(message, context, analysis);
      } catch (error) {
        console.error('Business logic handler error:', error);
        return null;
      }
    }
    
    // If no specific handler found, try to delegate to domain service
    return await this.delegateToDomainService(context.domain, analysis.primaryIntent, message, context, analysis);
  }

  /**
   * Delegate business logic to domain-specific services
   */
  private async delegateToDomainService(
    domain: string,
    intent: string,
    message: string,
    context: ConversationContext,
    analysis: any
  ): Promise<BusinessLogicResult | null> {
    // This method allows the AIService to remain generic while delegating
    // domain-specific logic to appropriate domain services
    
    // Domain services would be injected during initialization
    // For now, return null to indicate no domain-specific logic was found
    console.log(`No domain service found for ${domain}_${intent}`);
    return null;
  }

  /**
   * Register a domain-specific business logic handler
   */
  public registerBusinessLogicHandler(key: string, handler: Function): void {
    this.businessLogicHandlers.set(key, handler);
  }

  /**
   * Register multiple handlers from a domain service
   */
  public registerDomainHandlers(domain: string, handlers: Record<string, Function>): void {
    Object.entries(handlers).forEach(([intent, handler]) => {
      const key = `${domain}_${intent}`;
      this.businessLogicHandlers.set(key, handler);
    });
  }

  /**
   * Setup domain-specific business logic handlers
   */
  private setupBusinessLogicHandlers(): void {
    // Business logic handlers are now injected from domain services
    // This keeps the AIService generic and allows domain-specific logic
    // to be managed in their respective domain folders
    
    // Domain handlers will be registered through dependency injection
    // Example: this.registerDomainHandler('insurance', insuranceDomainService)
  }

  /**
   * Insurance quote handler (extracted from existing insurance logic)
   */
  private async handleInsuranceQuote(message: string, context: ConversationContext, analysis: any): Promise<BusinessLogicResult> {
    // Extract relevant information for quote calculation
    const quoteParams = this.extractInsuranceQuoteParams(message, context, analysis);
    
    if (!quoteParams.hasMinimumInfo) {
      return {
        type: 'info_needed',
        data: { missingFields: quoteParams.missing },
        confidence: 0.8,
        needsFollowUp: true
      };
    }

    // Calculate premium (simplified version)
    const baseRate = this.getBaseInsuranceRate(quoteParams.type);
    const riskMultiplier = this.calculateRiskMultiplier(quoteParams);
    const premium = baseRate * riskMultiplier;

    return {
      type: 'premium_quote',
      data: {
        type: quoteParams.type,
        premium: premium,
        currency: 'GHS',
        breakdown: {
          baseRate,
          riskMultiplier,
          factors: quoteParams.riskFactors
        }
      },
      confidence: 0.9,
      needsFollowUp: true
    };
  }

  /**
   * Resort booking handler
   */
  private async handleResortBooking(message: string, context: ConversationContext, analysis: any): Promise<BusinessLogicResult> {
    const bookingParams = this.extractBookingParams(message, context, analysis);
    
    if (!bookingParams.hasMinimumInfo) {
      return {
        type: 'info_needed',
        data: { missingFields: bookingParams.missing },
        confidence: 0.8,
        needsFollowUp: true
      };
    }

    // Check availability (mock implementation)
    const availability = await this.checkAvailability(bookingParams);
    
    return {
      type: 'booking_options',
      data: {
        availability,
        recommendations: this.generateBookingRecommendations(bookingParams),
        pricing: this.calculateBookingPricing(bookingParams)
      },
      confidence: 0.9,
      needsFollowUp: true
    };
  }

  /**
   * Pension calculation handler
   */
  private async handlePensionCalculation(message: string, context: ConversationContext, analysis: any): Promise<BusinessLogicResult> {
    const pensionParams = this.extractPensionParams(message, context, analysis);
    
    if (!pensionParams.hasMinimumInfo) {
      return {
        type: 'info_needed',
        data: { missingFields: pensionParams.missing },
        confidence: 0.8,
        needsFollowUp: true
      };
    }

    // Calculate pension benefits
    const monthlyBenefit = this.calculateSSNITBenefit(pensionParams);
    
    return {
      type: 'pension_calculation',
      data: {
        monthlyBenefit,
        projectedTotal: monthlyBenefit * 12 * pensionParams.expectedYears,
        breakdown: {
          contributionYears: pensionParams.contributionYears,
          averageSalary: pensionParams.averageSalary,
          currentAge: pensionParams.currentAge,
          retirementAge: pensionParams.retirementAge || 60
        }
      },
      confidence: 0.85,
      needsFollowUp: true
    };
  }

  // Helper methods for conversation management
  private getOrCreateConversation(userId: string, contextOverride?: Partial<ConversationContext>): ConversationContext {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        domain: this.domainConfig.domain,
        stage: this.domainConfig.defaultStage || 'initial',
        customerInfo: {},
        conversationHistory: [],
        clientId: this.clientConfig?.clientId,
        ...contextOverride
      });
    }
    
    const context = this.conversations.get(userId)!;
    
    // Apply context override if provided
    if (contextOverride) {
      Object.assign(context, contextOverride);
    }
    
    return context;
  }

  private addMessageToHistory(context: ConversationContext, role: 'user' | 'assistant', content: string): void {
    context.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });

    // Keep history manageable
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-15);
    }
  }

  // Utility methods for business logic handlers
  private extractInsuranceQuoteParams(message: string, context: ConversationContext, analysis: any): any {
    // Implementation would extract insurance-specific parameters
    return { 
      hasMinimumInfo: false, 
      missing: ['insurance_type', 'coverage_amount'],
      type: analysis.entityType || 'auto',
      riskFactors: []
    };
  }

  private extractInsuranceCalculationParams(message: string, context: ConversationContext, analysis: any): any {
    return { 
      hasMinimumInfo: false, 
      missing: ['calculation_type', 'base_parameters'],
      type: 'premium',
      breakdown: {},
      factors: []
    };
  }

  private extractResortQuoteParams(message: string, context: ConversationContext, analysis: any): any {
    return { 
      hasMinimumInfo: false, 
      missing: ['dates', 'guests', 'room_type']
    };
  }

  private extractPensionInfoParams(message: string, context: ConversationContext, analysis: any): any {
    return {
      type: analysis.entityType || 'general_info',
      specificQuery: analysis.extractedEntities || {}
    };
  }

  private performInsuranceCalculation(params: any): any {
    // Simplified calculation logic
    return {
      premium: 1200,
      coverage: params.coverageAmount || 50000,
      terms: '12 months'
    };
  }

  private calculateResortPricing(params: any): any {
    return {
      basePrice: 150,
      totalPrice: 300,
      packageDetails: 'Standard package',
      amenities: ['Pool', 'Spa', 'Restaurant'],
      availability: true
    };
  }

  private getPensionInformation(params: any): any {
    return {
      information: 'SSNIT pension information based on your query',
      resources: ['SSNIT website', 'Contribution calculator'],
      nextSteps: ['Check contribution history', 'Calculate benefits']
    };
  }

  private getBaseInsuranceRate(type: string): number {
    const rates = { auto: 500, health: 800, life: 300, business: 1200 };
    return rates[type as keyof typeof rates] || 500;
  }

  private calculateRiskMultiplier(params: any): number {
    return 1.0; // Simplified
  }

  private extractBookingParams(message: string, context: ConversationContext, analysis: any): any {
    return { hasMinimumInfo: false, missing: ['dates', 'guests'] };
  }

  private async checkAvailability(params: any): Promise<any> {
    return { available: true, rooms: [] };
  }

  private generateBookingRecommendations(params: any): any[] {
    return [];
  }

  private calculateBookingPricing(params: any): any {
    return { total: 0 };
  }

  private extractPensionParams(message: string, context: ConversationContext, analysis: any): any {
    return { hasMinimumInfo: false, missing: ['contribution_years', 'salary'] };
  }

  private calculateSSNITBenefit(params: any): number {
    return 0; // Simplified
  }

  private createDefaultAnalysis(message: string, context: ConversationContext): any {
    return {
      primaryIntent: 'INFORMATION',
      entityType: 'general',
      urgencyLevel: 'medium',
      emotionalState: 'neutral',
      requiresBusinessLogic: false,
      requiresDatabaseQuery: false,
      leadReadiness: 'exploring',
      nextBestAction: 'provide_info',
      confidence: 0.5
    };
  }

  private async queryKnowledge(message: string, context: ConversationContext): Promise<any> {
    if (!this.ragService) return null;
    
    try {
      return await this.ragService.queryKnowledge(message, {
        domain: context.domain,
        stage: context.stage,
        entityType: context.entityType
      });
    } catch (error) {
      console.error('RAG query error:', error);
      return null;
    }
  }

  private async generateResponse(
    message: string,
    context: ConversationContext,
    analysis: any,
    knowledge: any,
    options: QueryOptions
  ): Promise<{ message: string; confidence: number; businessResult?: any; followUpQuestions?: string[] }> {
    const systemPrompt = this.buildResponsePrompt(context, analysis, knowledge);
    const conversationMessages = this.buildConversationMessages(context, options);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationMessages,
          { role: 'user', content: message }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800
      });

      return {
        message: response.choices[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.',
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        message: this.domainConfig.fallbackMessage || 'I apologize, but I encountered an issue. Please try again.',
        confidence: 0.1
      };
    }
  }

  private buildResponsePrompt(context: ConversationContext, analysis: any, knowledge: any): string {
    let prompt = `You are a helpful AI assistant for ${context.domain} services.`;
    
    if (this.clientConfig) {
      prompt += ` You represent ${this.clientConfig.organizationName}.`;
      prompt += ` Your personality is ${this.clientConfig.aiConfig?.personality || 'professional'}.`;
      if (this.clientConfig.aiConfig?.systemPrompt) {
        prompt += `\n\nAdditional instructions: ${this.clientConfig.aiConfig.systemPrompt}`;
      }
    }

    prompt += `\n\nDomain: ${context.domain}`;
    prompt += `\nCurrent stage: ${context.stage}`;
    prompt += `\nUser intent: ${analysis.primaryIntent}`;
    prompt += `\nLead readiness: ${analysis.leadReadiness}`;

    if (knowledge) {
      prompt += `\n\nRelevant knowledge: ${JSON.stringify(knowledge).substring(0, 1000)}`;
    }

    prompt += `\n\nRespond helpfully and guide the conversation toward the business goals. Be concise but informative.`;

    return prompt;
  }

  private buildConversationMessages(context: ConversationContext, options: QueryOptions): any[] {
    if (!options.includeHistory) return [];
    
    const maxLength = options.maxHistoryLength || 10;
    const history = context.conversationHistory.slice(-maxLength);
    
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private calculateLeadScore(analysis: any, context: ConversationContext): number {
    let score = 0;
    
    // Intent-based scoring
    const intentScores = {
      'QUOTE': 30,
      'BOOKING': 35,
      'CALCULATION': 25,
      'INFORMATION': 10,
      'COMPLAINT': 5
    };
    score += intentScores[analysis.primaryIntent as keyof typeof intentScores] || 0;
    
    // Readiness-based scoring
    const readinessScores = {
      'qualified': 40,
      'ready': 30,
      'interested': 20,
      'exploring': 10
    };
    score += readinessScores[analysis.leadReadiness as keyof typeof readinessScores] || 0;
    
    // Urgency-based scoring
    const urgencyScores = {
      'urgent': 20,
      'high': 15,
      'medium': 10,
      'low': 5
    };
    score += urgencyScores[analysis.urgencyLevel as keyof typeof urgencyScores] || 0;
    
    // Conversation history bonus
    if (context.conversationHistory.length > 3) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  private updateConversationState(context: ConversationContext, analysis: any): void {
    // Update stage based on conversation progress
    if (analysis.leadReadiness === 'ready' && context.stage === 'initial') {
      context.stage = 'qualified';
    } else if (analysis.leadReadiness === 'qualified') {
      context.stage = 'closing';
    }
    
    // Update entity type if detected
    if (analysis.entityType && analysis.entityType !== 'general') {
      context.entityType = analysis.entityType;
    }
    
    // Store extracted entities
    if (analysis.extractedEntities) {
      context.customerInfo = { ...context.customerInfo, ...analysis.extractedEntities };
    }
  }

  private createResponseWithBusinessLogic(
    message: string,
    context: ConversationContext,
    analysis: any,
    businessResult: BusinessLogicResult
  ): AIResponse {
    let responseMessage = '';
    
    switch (businessResult.type) {
      case 'premium_quote':
        responseMessage = `Based on your requirements, I've calculated a ${businessResult.data.type} insurance premium of GHS ${businessResult.data.premium}. This quote includes ${businessResult.data.breakdown.factors?.join(', ') || 'standard coverage'}. Would you like me to explain the coverage details or help you proceed with an application?`;
        break;
        
      case 'booking_options':
        responseMessage = `I found several availability options for your stay. The pricing starts at GHS ${businessResult.data.pricing?.total || 'TBD'} for your dates. Would you like me to show you the available rooms and packages?`;
        break;
        
      case 'pension_calculation':
        responseMessage = `Based on your contribution history, your estimated monthly SSNIT pension benefit would be GHS ${businessResult.data.monthlyBenefit}. This is calculated from ${businessResult.data.breakdown.contributionYears} years of contributions. Would you like me to explain how this amount was calculated or discuss ways to potentially increase your benefits?`;
        break;
        
      case 'info_needed':
        responseMessage = `To provide you with accurate information, I need a few more details: ${businessResult.data.missingFields?.join(', ')}. Could you please provide these details?`;
        break;
        
      default:
        responseMessage = `I've processed your request and found some relevant information. ${JSON.stringify(businessResult.data)}`;
    }

    return {
      message: responseMessage,
      confidence: businessResult.confidence,
      leadScore: this.calculateLeadScore(analysis, context),
      shouldCaptureLead: businessResult.type !== 'info_needed',
      nextAction: businessResult.needsFollowUp ? 'gather_details' : 'continue',
      context,
      businessResult: businessResult.data
    };
  }

  private createErrorResponse(userId: string, message: string, error: any): AIResponse {
    const context = this.getOrCreateConversation(userId);
    const fallbackMessage = this.clientConfig?.aiConfig?.fallbackMessage || 
                           this.domainConfig.fallbackMessage || 
                           'I apologize, but I encountered an error. Please try again.';

    return {
      message: fallbackMessage,
      confidence: 0.1,
      leadScore: 0,
      shouldCaptureLead: false,
      nextAction: 'error_recovery',
      context
    };
  }

  // Public utility methods
  public getConversationContext(userId: string): ConversationContext | undefined {
    return this.conversations.get(userId);
  }

  public clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }

  public async healthCheck(): Promise<{ status: string; details: any }> {
    const details: any = {
      initialized: this.initialized,
      domain: this.domainConfig.domain,
      clientId: this.clientConfig?.clientId || 'default',
      activeConversations: this.conversations.size
    };

    // Check dependencies
    if (this.ragService) {
      details.ragService = 'available';
    }
    if (this.databaseAdapter) {
      details.databaseAdapter = 'available';
    }
    if (this.vectorStore) {
      details.vectorStore = 'available';
    }

    return {
      status: this.initialized ? 'healthy' : 'initializing',
      details
    };
  }

  public setDependencies(dependencies: { ragService?: any; databaseAdapter?: any; vectorStore?: any }): void {
    if (dependencies.ragService) this.ragService = dependencies.ragService;
    if (dependencies.databaseAdapter) this.databaseAdapter = dependencies.databaseAdapter;
    if (dependencies.vectorStore) this.vectorStore = dependencies.vectorStore;
  }
}

export default AIService;