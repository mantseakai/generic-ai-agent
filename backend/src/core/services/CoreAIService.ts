// File: backend/src/core/services/CoreAIService.ts

import OpenAI from 'openai';
import { DomainConfig } from '../config/DomainConfigFactory';
import { MultiClientVectorStore } from './MultiClientVectorStore';
import { MultiClientDatabaseAdapter } from './MultiClientDatabaseAdapter';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ConversationContext {
  clientId: string;
  domain: string;
  stage: string;
  entityType?: string;
  customerInfo: Record<string, any>;
  businessLogic?: Record<string, any>;
  conversationHistory: ConversationMessage[];
  leadScore: number;
  [key: string]: any;
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
}

interface RAGContext {
  relevantDocuments: Array<{
    content: string;
    metadata: any;
    similarity: number;
  }>;
  searchQuery: string;
  retrievalMethod: string;
}

export class CoreAIService {
  private openai: OpenAI;
  private vectorStore: MultiClientVectorStore;
  private databaseAdapter: MultiClientDatabaseAdapter;
  private conversations: Map<string, Map<string, ConversationContext>> = new Map(); // clientId -> userId -> context

  constructor(
    vectorStore: MultiClientVectorStore,
    databaseAdapter: MultiClientDatabaseAdapter
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    this.vectorStore = vectorStore;
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing Core AI Service');
    
    if (!this.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    

    console.log('✅ Core AI Service ready');
  }

  /**
   * Process user message with client-specific domain configuration
   */
  async processMessage(
    clientId: string,
    userId: string,
    message: string,
    domainConfig: DomainConfig,
    contextOverride?: Partial<ConversationContext>
  ): Promise<AIResponse> {
    try {
      // Get or create conversation context
      const conversation = this.getOrCreateConversation(clientId, userId, domainConfig, contextOverride);
      
      // Add user message to history
      conversation.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Analyze message and determine intent
      const analysis = await this.analyzeMessage(message, conversation, domainConfig);
      
      // Retrieve relevant context using RAG
      const ragContext = await this.retrieveContext(clientId, message, domainConfig.domain);
      
      // Check for business logic triggers
      const businessResult = await this.processBusinessLogic(
        clientId,
        analysis,
        conversation,
        domainConfig
      );

      // Generate AI response
      const response = await this.generateResponse(
        message,
        conversation,
        domainConfig,
        ragContext,
        analysis,
        businessResult
      );

      // Update conversation context
      this.updateConversation(clientId, userId, response);

      return response;

    } catch (error) {
      console.error('Error processing message:', error);
      return this.createErrorResponse(domainConfig);
    }
  }

  /**
   * Get or create conversation context for a user
   */
  private getOrCreateConversation(
    clientId: string,
    userId: string,
    domainConfig: DomainConfig,
    contextOverride?: Partial<ConversationContext>
  ): ConversationContext {
    if (!this.conversations.has(clientId)) {
      this.conversations.set(clientId, new Map());
    }

    const clientConversations = this.conversations.get(clientId)!;
    
    if (!clientConversations.has(userId)) {
      clientConversations.set(userId, {
        clientId,
        domain: domainConfig.domain,
        stage: domainConfig.defaultStage,
        customerInfo: {},
        conversationHistory: [],
        leadScore: 0,
        ...contextOverride
      });
    }

    const conversation = clientConversations.get(userId)!;
    
    // Apply context override if provided
    if (contextOverride) {
      Object.assign(conversation, contextOverride);
    }

    return conversation;
  }

  /**
   * Analyze user message to determine intent and extract entities
   */
  private async analyzeMessage(
    message: string,
    conversation: ConversationContext,
    domainConfig: DomainConfig
  ): Promise<any> {
    const analysisPrompt = `
${domainConfig.analysisInstructions}

Current conversation stage: ${conversation.stage}
User message: "${message}"
Conversation history: ${JSON.stringify(conversation.conversationHistory.slice(-3))}

Analyze this message and return a JSON object with:
- intent: string (primary intent)
- entities: object (extracted entities)
- nextStage: string (suggested next conversation stage)
- confidence: number (0-1)
- triggerBusinessLogic: boolean
- businessLogicType: string (if triggered)
- extractedParams: object (parameters for business logic)
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing user messages and returning structured JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      const analysisText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(analysisText);
    } catch (error) {
      console.error('Error analyzing message:', error);
      return {
        intent: 'unknown',
        entities: {},
        nextStage: conversation.stage,
        confidence: 0.5,
        triggerBusinessLogic: false
      };
    }
  }

  /**
   * Retrieve relevant context using vector search
   */
  private async retrieveContext(
    clientId: string,
    query: string,
    domain: string
  ): Promise<RAGContext> {
    try {
      const results = await this.vectorStore.query(query, {
        clientId,
        domain,
        stage: 'active',
        urgencyLevel: 'medium'
      });
      
      return {
        relevantDocuments: results.documents.map(doc => ({
          content: doc.content,
          metadata: doc.metadata,
          similarity: results.relevanceScore
        })),
        searchQuery: query,
        retrievalMethod: 'vector_similarity'
      };
    } catch (error) {
      console.error('Error retrieving context:', error);
      return {
        relevantDocuments: [],
        searchQuery: query,
        retrievalMethod: 'fallback'
      };
    }
  }

  /**
   * Process business logic if triggered
   */
  private async processBusinessLogic(
    clientId: string,
    analysis: any,
    conversation: ConversationContext,
    domainConfig: DomainConfig
  ): Promise<any> {
    if (!analysis.triggerBusinessLogic || !analysis.businessLogicType) {
      return null;
    }

    const handler = domainConfig.businessLogicHandlers[analysis.businessLogicType];
    if (!handler) {
      console.warn(`No handler found for business logic: ${analysis.businessLogicType}`);
      return null;
    }

    try {
      // Get database adapter for this client if available
      const dbAdapter = this.databaseAdapter.getClientAdapter(clientId);
      
      return await handler(
        analysis.extractedParams,
        conversation.customerInfo,
        dbAdapter
      );
    } catch (error) {
      console.error('Error processing business logic:', error);
      return {
        error: true,
        message: 'Unable to process business logic at this time'
      };
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  private async generateResponse(
    message: string,
    conversation: ConversationContext,
    domainConfig: DomainConfig,
    ragContext: RAGContext,
    analysis: any,
    businessResult: any
  ): Promise<AIResponse> {
    // Build context for the AI
    const contextDocuments = ragContext.relevantDocuments
      .map(doc => `Document: ${doc.content}`)
      .join('\n\n');

    const businessLogicContext = businessResult ? 
      `Business Logic Result: ${JSON.stringify(businessResult, null, 2)}` : '';

    const systemMessage = `
${domainConfig.systemPrompt}

${domainConfig.responseInstructions}

Current conversation stage: ${conversation.stage}
Customer information: ${JSON.stringify(conversation.customerInfo)}

Relevant context:
${contextDocuments}

${businessLogicContext}

Remember to follow the stage flow defined in the domain configuration.
`;

    const conversationMessages = [
      { role: 'system' as const, content: systemMessage },
      ...conversation.conversationHistory.slice(-6).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseMessage = completion.choices[0]?.message?.content || domainConfig.fallbackMessage;

      // Calculate lead score
      const newLeadScore = this.calculateLeadScore(conversation, analysis, domainConfig);

      // Determine next stage
      const nextStage = this.determineNextStage(analysis, conversation, domainConfig);

      // Generate follow-up questions if needed
      const followUpQuestions = this.generateFollowUpQuestions(analysis, conversation, domainConfig);

      return {
        message: responseMessage,
        confidence: analysis.confidence || 0.8,
        leadScore: newLeadScore,
        shouldCaptureLead: newLeadScore >= domainConfig.leadCaptureThreshold,
        nextAction: analysis.intent || 'continue_conversation',
        context: {
          ...conversation,
          stage: nextStage
        },
        businessResult,
        followUpQuestions
      };

    } catch (error) {
      console.error('Error generating response:', error);
      return this.createErrorResponse(domainConfig);
    }
  }

  /**
   * Calculate lead score based on conversation analysis
   */
  private calculateLeadScore(
    conversation: ConversationContext,
    analysis: any,
    domainConfig: DomainConfig
  ): number {
    let score = conversation.leadScore || 0;

    // Apply domain-specific scoring weights
    Object.entries(domainConfig.leadScoringWeights).forEach(([factor, weight]) => {
      if (analysis.entities && analysis.entities[factor]) {
        score += weight;
      }
    });

    // Engagement scoring
    const messageCount = conversation.conversationHistory.length;
    score += Math.min(messageCount * 0.5, 5); // Cap engagement bonus

    // Business logic interaction bonus
    if (analysis.triggerBusinessLogic) {
      score += 2;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Determine next conversation stage
   */
  private determineNextStage(
    analysis: any,
    conversation: ConversationContext,
    domainConfig: DomainConfig
  ): string {
    const currentStage = conversation.stage;
    const stageFlow = domainConfig.stageFlow[currentStage];

    if (!stageFlow || !analysis.intent) {
      return currentStage;
    }

    return stageFlow[analysis.intent] || currentStage;
  }

  /**
   * Generate follow-up questions based on context
   */
  private generateFollowUpQuestions(
    analysis: any,
    conversation: ConversationContext,
    domainConfig: DomainConfig
  ): string[] {
    // This could be enhanced with AI-generated questions
    // For now, return domain-specific defaults
    const questions: string[] = [];

    if (conversation.stage === domainConfig.defaultStage) {
      questions.push("What specific information are you looking for?");
    }

    if (analysis.triggerBusinessLogic && (!analysis.extractedParams || Object.keys(analysis.extractedParams).length < 2)) {
      questions.push("Could you provide more details to help me assist you better?");
    }

    return questions;
  }

  /**
   * Update conversation context
   */
  private updateConversation(clientId: string, userId: string, response: AIResponse): void {
    const clientConversations = this.conversations.get(clientId);
    if (clientConversations) {
      const conversation = clientConversations.get(userId);
      if (conversation) {
        // Add assistant response to history
        conversation.conversationHistory.push({
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        });

        // Update context
        Object.assign(conversation, response.context);
        
        clientConversations.set(userId, conversation);
      }
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(domainConfig: DomainConfig): AIResponse {
    return {
      message: domainConfig.fallbackMessage,
      confidence: 0.1,
      leadScore: 0,
      shouldCaptureLead: false,
      nextAction: 'error_recovery',
      context: {
        clientId: '',
        domain: domainConfig.domain,
        stage: domainConfig.defaultStage,
        customerInfo: {},
        conversationHistory: [],
        leadScore: 0
      }
    };
  }

  /**
   * Get conversation context for a user
   */
  getConversationContext(clientId: string, userId: string): ConversationContext | null {
    const clientConversations = this.conversations.get(clientId);
    return clientConversations?.get(userId) || null;
  }

  /**
   * Clear conversation context for a user
   */
  clearConversationContext(clientId: string, userId: string): void {
    const clientConversations = this.conversations.get(clientId);
    if (clientConversations) {
      clientConversations.delete(userId);
    }
  }

  /**
   * Get all active conversations for a client
   */
  getClientConversations(clientId: string): Map<string, ConversationContext> {
    return this.conversations.get(clientId) || new Map();
  }

  /**
   * Clean up old conversations (memory management)
   */
  cleanupOldConversations(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    this.conversations.forEach((clientConversations, clientId) => {
      clientConversations.forEach((conversation, userId) => {
        const lastMessage = conversation.conversationHistory[conversation.conversationHistory.length - 1];
        if (lastMessage && lastMessage.timestamp < cutoffTime) {
          clientConversations.delete(userId);
        }
      });
      
      // Clean up empty client maps
      if (clientConversations.size === 0) {
        this.conversations.delete(clientId);
      }
    });
  }

  /**
   * Cleanup method for service shutdown
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up CoreAIService...');
    
    try {
      // Clear all conversations
      this.conversations.clear();
      
      // Cleanup old conversations immediately
      this.cleanupOldConversations(0);
      
      console.log('CoreAIService cleanup completed');
      
    } catch (error) {
      console.error('Error during CoreAIService cleanup:', error);
    }
  }
}