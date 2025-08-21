// Clean Base RAG Types - Phase 2 Component 2
// File: backend/src/types/base-rag.ts
// This replaces unified-rag.ts with clean, domain-agnostic types

// ===== CORE RAG DOCUMENT TYPES =====

export interface BaseRAGDocument {
  id: string;
  content: string;
  metadata: {
    type: 'product' | 'service' | 'process' | 'policy' | 'faq' | 'guide' | 'calculation' | 'legal' | 'marketing';
    category: string;
    subcategory?: string;
    priority: 'high' | 'medium' | 'low' | 'critical';
    
    // Domain and client context
    domain: string; // 'insurance', 'resort', 'pension', etc.
    clientId?: string;
    
    // Content metadata
    tags?: string[];
    lastUpdated: Date;
    version: string;
    effectiveness?: number; // 0-1 based on historical performance
    
    // Contextual relevance
    customerSegments?: string[];
    seasonalRelevance?: string[];
    locationRelevance?: string[];
    urgencyLevels?: string[];
    conversationStages?: string[];
    
    // Business logic indicators (domain-agnostic)
    triggersBusinessLogic?: boolean;
    businessLogicType?: string;
    requiresCalculation?: boolean;
    
    // Additional metadata storage for domain-specific data
    domainSpecific?: Record<string, any>;
  };
  embedding?: number[];
}

// ===== CUSTOMER PROFILE TYPES (Generic) =====

export interface BaseCustomerProfile {
  // Demographics
  age?: number;
  location: string;
  occupation?: string;
  incomeRange?: 'low' | 'medium' | 'high' | 'premium';
  familySize?: number;
  
  // Behavioral
  communicationPreference?: 'phone' | 'email' | 'whatsapp' | 'chat';
  riskTolerance?: 'low' | 'medium' | 'high';
  decisionMakingStyle?: 'analytical' | 'emotional' | 'social' | 'practical';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Engagement
  previousInteractions?: number;
  loyaltyLevel?: 'new' | 'returning' | 'loyal' | 'advocate';
  referralSource?: string;
  
  // Preferences
  budgetSensitive?: boolean;
  valueSeeker?: boolean;
  premiumBuyer?: boolean;
  
  // Domain-specific data storage
  domainSpecific?: Record<string, any>;
}

// ===== CONVERSATION CONTEXT TYPES =====

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: Record<string, any>;
    businessLogicTriggered?: boolean;
    calculationPerformed?: boolean;
  };
}

export interface BaseConversationContext {
  // Basic context
  domain: string;
  clientId?: string;
  stage: string; // Domain-specific stages like 'discovery', 'presentation', 'closing'
  
  // Conversation tracking
  messageCount: number;
  conversationHistory: ConversationMessage[];
  startTime: Date;
  lastInteractionTime: Date;
  totalSessionTime?: number; // minutes
  averageResponseTime?: number; // seconds
  
  // Intent and progress tracking
  primaryIntent?: string;
  topicsDiscussed: string[];
  questionsAsked: number;
  informationProvided: string[];
  objectionsRaised?: string[];
  
  // Customer information
  customerInfo: Record<string, any>;
  customerProfile?: Partial<BaseCustomerProfile>;
  
  // Business context
  productInterest?: string[];
  serviceNeeds?: string[];
  budgetRange?: { min?: number; max?: number; currency?: string };
  
  // Lead qualification
  leadScore?: number;
  qualificationCriteria?: Record<string, boolean>;
  buyingSignals?: string[];
  
  // Domain-specific context storage
  domainSpecific?: Record<string, any>;
}

// ===== QUERY AND RESPONSE TYPES =====

export interface QueryContext {
  // Query enhancement
  originalQuery: string;
  enhancedQuery?: string;
  
  // Contextual filters
  domain: string;
  clientId?: string;
  customerSegment?: string;
  conversationStage?: string;
  urgencyLevel?: string;
  
  // Retrieval parameters
  maxResults?: number;
  minRelevanceScore?: number;
  includeCalculations?: boolean;
  
  // Temporal context
  seasonalContext?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  
  // Domain-specific query context
  domainSpecific?: Record<string, any>;
}

export interface QueryResult {
  documents: BaseRAGDocument[];
  relevanceScores: number[];
  totalFound: number;
  processingTime: number;
  
  // Enhanced context
  contextUsed: {
    customerMatch: number;
    seasonalRelevance: number;
    urgencyAlignment: number;
    domainAlignment: number;
  };
  
  // Query enhancement info
  queryEnhanced: boolean;
  enhancementApplied?: string[];
  fallbackUsed: boolean;
  
  // Performance metadata
  cacheHit: boolean;
  documentsFiltered: number;
  
  // Domain-specific results
  domainSpecific?: Record<string, any>;
}

// ===== AI ANALYSIS TYPES =====

export interface BaseAIAnalysis {
  // Intent detection
  primaryIntent: string;
  secondaryIntents?: string[];
  confidence: number;
  
  // Entity extraction
  entities: Record<string, any>;
  extractedValues: Record<string, any>;
  
  // Emotional and urgency analysis
  emotionalState: 'neutral' | 'excited' | 'frustrated' | 'confused' | 'satisfied' | 'angry' | 'happy';
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
  
  // Business logic indicators
  requiresBusinessLogic: boolean;
  businessLogicType?: string;
  requiresCalculation: boolean;
  calculationType?: string;
  requiresDatabaseQuery: boolean;
  
  // Lead assessment
  leadReadiness: 'exploring' | 'interested' | 'ready' | 'qualified';
  buyingSignals: string[];
  objectionSignals: string[];
  
  // Next best action
  nextBestAction: string;
  recommendedResponse: string;
  followUpQuestions?: string[];
  
  // Domain-specific analysis
  domainSpecific?: Record<string, any>;
}

// ===== RESPONSE TYPES =====

export interface BaseAIResponse {
  // Core response
  message: string;
  confidence: number;
  
  // Context and analysis
  usedKnowledge: QueryResult | null;
  analysis: BaseAIAnalysis;
  context: BaseConversationContext;
  
  // Lead management
  leadScore: number;
  shouldCaptureLead: boolean;
  leadQualification?: {
    criteria: Record<string, boolean>;
    score: number;
    readiness: string;
  };
  
  // Business actions
  businessLogicResult?: {
    type: string;
    data: any;
    needsFollowUp: boolean;
    confidence: number;
  };
  
  // Recommendations
  nextAction: string;
  followUpQuestions?: string[];
  recommendations?: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    data?: any;
  }>;
  
  // Performance metadata
  processingTime: number;
  ragUsed: boolean;
  businessLogicUsed: boolean;
  
  // Domain-specific response data
  domainSpecific?: Record<string, any>;
}

// ===== BUSINESS LOGIC TYPES =====

export interface BusinessLogicRequest {
  type: string; // 'calculation', 'quote', 'booking', 'eligibility', etc.
  domain: string;
  clientId?: string;
  
  // Input parameters
  parameters: Record<string, any>;
  customerProfile?: Partial<BaseCustomerProfile>;
  conversationContext?: Partial<BaseConversationContext>;
  
  // Processing options
  includeBreakdown?: boolean;
  includeAlternatives?: boolean;
  applyDiscounts?: boolean;
  
  // Validation
  validationRequired: boolean;
  requiredFields?: string[];
}

export interface BusinessLogicResponse {
  // Core result
  type: string;
  success: boolean;
  data: any;
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
  missingFields?: string[];
  
  // Calculation details (if applicable)
  breakdown?: Record<string, any>;
  alternatives?: any[];
  discountsApplied?: any[];
  
  // Business metadata
  confidence: number;
  needsFollowUp: boolean;
  recommendedNextSteps?: string[];
  
  // Processing info
  processingTime: number;
  calculationMethod?: string;
  
  // Domain-specific result data
  domainSpecific?: Record<string, any>;
}

// ===== CONFIGURATION TYPES =====

export interface DomainConfiguration {
  domain: string;
  
  // AI behavior
  personality: 'professional' | 'friendly' | 'casual' | 'expert';
  systemPrompt?: string;
  fallbackMessage: string;
  
  // Conversation flow
  defaultStage: string;
  stages: Record<string, {
    name: string;
    nextStages: string[];
    businessLogicEnabled: boolean;
    leadCaptureEnabled: boolean;
  }>;
  
  // Lead management
  leadCaptureThreshold: number; // 0-100
  qualificationCriteria: Record<string, {
    required: boolean;
    weight: number;
  }>;
  
  // Business logic configuration
  businessLogicHandlers: Record<string, {
    type: string;
    enabled: boolean;
    config?: Record<string, any>;
  }>;
  
  // RAG configuration
  ragConfig: {
    enabled: boolean;
    maxResults: number;
    minRelevanceScore: number;
    enableContextBuilding: boolean;
    enableQueryEnhancement: boolean;
  };
  
  // Domain-specific configuration
  domainSpecific?: Record<string, any>;
}

// ===== PERFORMANCE AND ANALYTICS TYPES =====

export interface ConversationMetrics {
  conversationId: string;
  domain: string;
  clientId?: string;
  
  // Basic metrics
  duration: number; // minutes
  messageCount: number;
  averageResponseTime: number; // seconds
  
  // Engagement metrics
  topicsDiscussed: string[];
  questionsAsked: number;
  businessLogicTriggered: number;
  calculationsPerformed: number;
  
  // Outcome metrics
  leadCaptured: boolean;
  leadScore: number;
  conversionProbability?: number;
  outcome: 'ongoing' | 'lead_captured' | 'converted' | 'abandoned' | 'escalated';
  
  // Quality metrics
  customerSatisfaction?: number; // 1-5 if collected
  aiConfidenceAverage: number;
  ragEffectiveness?: number;
  
  // Domain-specific metrics
  domainSpecific?: Record<string, any>;
}

export interface SystemPerformanceMetrics {
  timestamp: Date;
  
  // Response times
  averageResponseTime: number;
  ragQueryTime: number;
  businessLogicTime: number;
  
  // Success rates
  successfulResponses: number;
  failedResponses: number;
  fallbacksUsed: number;
  
  // Resource usage
  activeConversations: number;
  ragQueriesPerMinute: number;
  businessLogicCallsPerMinute: number;
  
  // Cache performance
  ragCacheHitRate: number;
  contextCacheHitRate: number;
  
  // Domain breakdown
  domainMetrics: Record<string, {
    conversations: number;
    averageResponseTime: number;
    successRate: number;
  }>;
}

// ===== UTILITY TYPES =====

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  domain?: string;
  clientId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  priority?: string[];
  type?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  suggestions?: string[];
}

// ===== TYPE GUARDS AND UTILITIES =====

export function isBaseRAGDocument(doc: any): doc is BaseRAGDocument {
  return doc && 
         typeof doc.id === 'string' && 
         typeof doc.content === 'string' && 
         doc.metadata && 
         typeof doc.metadata.domain === 'string';
}

export function isValidConversationContext(context: any): context is BaseConversationContext {
  return context && 
         typeof context.domain === 'string' && 
         typeof context.stage === 'string' && 
         Array.isArray(context.conversationHistory);
}

export function createDefaultCustomerProfile(): BaseCustomerProfile {
  return {
    location: 'unknown',
    riskTolerance: 'medium',
    communicationPreference: 'chat',
    decisionMakingStyle: 'practical',
    urgencyLevel: 'medium',
    previousInteractions: 0,
    loyaltyLevel: 'new',
    budgetSensitive: false,
    valueSeeker: true,
    premiumBuyer: false
  };
}

export function createDefaultConversationContext(domain: string, clientId?: string): BaseConversationContext {
  return {
    domain,
    clientId,
    stage: 'initial',
    messageCount: 0,
    conversationHistory: [],
    startTime: new Date(),
    lastInteractionTime: new Date(),
    topicsDiscussed: [],
    questionsAsked: 0,
    informationProvided: [],
    customerInfo: {},
    productInterest: [],
    serviceNeeds: [],
    buyingSignals: []
  };
}

// ===== DOMAIN-SPECIFIC TYPE HELPERS =====

export interface DomainSpecificExtensions {
  // Insurance domain extensions would be defined in domains/insurance/types.ts
  // Resort domain extensions would be defined in domains/resort/types.ts
  // Pension domain extensions would be defined in domains/pension/types.ts
}

// ===== MIGRATION HELPERS =====

export interface LegacyCompatibility {
  // For backward compatibility during migration
  convertFromUnifiedRAG?: (legacyData: any) => BaseRAGDocument;
  convertToUnifiedRAG?: (baseData: BaseRAGDocument) => any;
  
  // Legacy type mappings
  legacyTypeMapping: Record<string, string>;
  legacyFieldMapping: Record<string, string>;
}

// ===== EXPORTS FOR CLEAN SEPARATION =====

// Core types that replace unified-rag.ts
export type {
  BaseRAGDocument as RAGDocument,
  BaseCustomerProfile as CustomerProfile,
  BaseConversationContext as ConversationContext,
  BaseAIAnalysis as AIAnalysis,
  BaseAIResponse as AIResponse
};

// Legacy aliases for backward compatibility during migration
export type EnhancedRAGDocument = BaseRAGDocument;
export type EnhancedQueryResult = QueryResult;
export type ContextualQueryResult = QueryResult;