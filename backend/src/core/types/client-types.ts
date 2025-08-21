// Client Management Types and Interfaces
// File: backend/src/core/types/client-types.ts

export interface ClientConfig {
  clientId: string;
  organizationName: string;
  domains: string[]; // ['insurance', 'resort', 'pension', etc.]
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'trial';
  contactEmail: string;
  
  // WhatsApp Integration (enhances existing system)
  whatsapp: {
    businessPhoneNumber: string;
    webhookToken: string;
    qrCodeBranding: {
      logo?: string;
      colors: {
        primary: string;   // Default: '#25D366'
        secondary: string; // Default: '#128C7E'
      };
      companyName: string;
    };
  };
  
  // AI Configuration
  aiConfig: {
    systemPrompt: string;
    fallbackMessage: string;
    personality: 'professional' | 'friendly' | 'casual';
  };
  
  // Social Media Accounts (per client)
  socialMedia: {
    tiktok?: {
      accessToken: string;
      accountId: string;
    };
    instagram?: {
      accessToken: string;
      accountId: string;
    };
    twitter?: {
      apiKey: string;
      apiSecret: string;
      accessToken: string;
      accessTokenSecret: string;
    };
    linkedin?: {
      accessToken: string;
      pageId: string;
    };
  };
  
  // Database Configuration (per client)
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
    connectionString: string;
    schema?: string;
    poolSize?: number;
  };
  
  limits?: {
    messagesPerDay?: number;
    socialPostsPerDay?: number;
    databaseQueriesPerDay?: number;
  };
  
  billingTier?: 'basic' | 'professional' | 'enterprise';
}

export interface ClientUsage {
  clientId: string;
  
  // Daily counters (reset at midnight)
  messagesThisDay: number;
  socialPostsThisDay: number;
  databaseQueriesThisDay: number;
  lastResetDate: Date;
  
  // Total counters (lifetime)
  totalMessages: number;
  totalSocialPosts: number;
  totalQueries: number;
  
  // Performance metrics
  averageResponseTime?: number;
  errorRate?: number;
  lastActivity?: Date;
}

export interface ClientAnalytics {
  clientId: string;
  organizationName: string;
  period: {
    start: Date;
    end: Date;
    type: 'day' | 'week' | 'month';
  };
  
  metrics: {
    totalMessages: number;
    avgResponseTime: number;
    leadsCaptured: number;
    socialMediaPosts: number;
    databaseQueries: number;
    topDomains: Array<{
      domain: string;
      messageCount: number;
      percentage: number;
    }>;
    userSatisfaction: number; // 1-5 rating
    peakUsageHours: number[];
  };
  
  usage: {
    messagesUsed: number;
    messagesLimit: number;
    socialPostsUsed: number;
    socialPostsLimit: number;
    queriesUsed: number;
    queriesLimit: number;
    utilizationRate: number; // 0-1
  };
  
  performance: {
    uptime: number; // percentage
    errorRate: number; // percentage
    avgResponseTime: number; // milliseconds
    slowestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
    }>;
  };
}

export interface ClientHealthStatus {
  clientId: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  lastChecked: Date;
  
  issues: Array<{
    type: 'usage_limit' | 'performance' | 'error_rate' | 'connectivity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: any;
  }>;
  
  metrics: {
    responseTime: number;
    errorRate: number;
    usagePercentage: number;
    connectivityStatus: boolean;
  };
}

// Multi-client API request/response types
export interface MultiClientChatRequest {
  message: string;
  userId: string;
  context?: {
    domain?: string;
    stage?: string;
    customerInfo?: Record<string, any>;
    sessionId?: string;
    source?: 'web' | 'whatsapp' | 'api';
  };
}

export interface MultiClientChatResponse {
  success: boolean;
  clientId: string;
  domain: string;
  data: {
    response: string;
    confidence: number;
    engagementScore: number;
    shouldCaptureLead: boolean;
    businessResult?: any;
    recommendations?: string[];
    metadata: {
      usedKnowledge: any;
      nextState: string;
      timestamp: string;
      organizationName: string;
      processingTime: number;
      clientSpecific?: any;
      error?:boolean | null; // Indicates if there was an error in processing
    };
  };
  error?: string;
}

export interface ClientCreateRequest {
  organizationName: string;
  domains: string[];
  contactEmail: string;
  businessPhoneNumber?: string; // ADDED MISSING FIELD
  industry?: string; // ADDED MISSING FIELD
  socialMedia?: {
    tiktok?: {
      accessToken: string;
      accountId: string;}
    instagram?: {
      accessToken: string;
      accountId: string;}
    twitter?: {
      apiKey: string;
      apiSecret: string;
      accessToken: string;
      accessTokenSecret: string;}
    linkedin?: {
      accessToken: string;
      pageId: string;}
  };            
  whatsapp: {
    businessPhoneNumber: string;
    qrCodeBranding?: {
      logo?: string;
      colors?: {
        primary: string;
        secondary: string;
      };
    };
  };
  
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
    connectionString: string;
    schema?: string;
  };
  
  aiConfig?: {
    systemPrompt?: string;
    personality?: 'professional' | 'friendly' | 'casual';
  };
  
  billingTier?: 'basic' | 'professional' | 'enterprise';
}

export interface ClientCreateResponse {
  success: boolean;
  clientId?: string;
  apiCredentials?: {
    clientId: string;
    apiKey: string;
    webhookToken: string;
  };
  endpoints?: {
    chat: string;
    whatsapp: string;
    social: string;
    analytics: string;
  };
  error?: string;
}

// WhatsApp Multi-Client Types (enhances existing system)
export interface MultiClientWhatsAppConfig {
  clientId: string;
  businessPhoneNumber: string;
  webhookToken: string;
  branding: {
    companyName: string;
    colors: {
      primary: string;
      secondary: string;
    };
    logo?: string;
  };
  messageTemplates: Record<string, string>;
}

export interface WhatsAppQRRequest {
  clientId: string;
  type: string;
  size?: string;
  domain?: string;
  source?: string;
}

// Social Media Multi-Client Types
export interface SocialMediaPostRequest {
  clientId: string;
  platforms: string[];
  content: {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    hashtags?: string[];
    scheduleAt?: Date;
  };
  domain?: string;
  targetAudience?: string;
}

export interface SocialMediaPostResponse {
  success: boolean;
  clientId: string;
  campaignId: string;
  results: Array<{
    platform: string;
    success: boolean;
    postId?: string;
    url?: string;
    error?: string;
  }>;
  analytics: {
    estimatedReach: number;
    engagementForecast: number;
  };
}

// Database Query Multi-Client Types
export interface DatabaseQueryRequest {
  clientId: string;
  naturalLanguage: string;
  domain?: string;
  resultLimit?: number;
}

export interface DatabaseQueryResponse {
  success: boolean;
  clientId: string;
  query: {
    natural: string;
    sql: string;
    confidence: number;
  };
  data: any[];
  metadata: {
    rowCount: number;
    executionTime: number;
    fromCache: boolean;
  };
  error?: string;
}

// Client Management Admin Types
export interface ClientListItem {
  clientId: string;
  organizationName: string;
  domains: string[];
  status: 'active' | 'suspended' | 'trial';
  billingTier: 'basic' | 'professional' | 'enterprise';
  createdAt: Date;
  lastActivity: Date;
  usageToday: {
    messages: number;
    socialPosts: number;
    queries: number;
  };
  health: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface ClientUpdateRequest {
  organizationName?: string;
  domains?: string[];
  limits?: {
    messagesPerDay?: number;
    socialPostsPerDay?: number;
    databaseQueriesPerDay?: number;
  };
  aiConfig?: {
    systemPrompt?: string;
    fallbackMessage?: string;
    personality?: 'professional' | 'friendly' | 'casual';
  };
  status?: 'active' | 'suspended' | 'trial';
  billingTier?: 'basic' | 'professional' | 'enterprise';
}

// Error types for multi-client operations
export interface ClientError {
  code: 'CLIENT_NOT_FOUND' | 'DOMAIN_NOT_AVAILABLE' | 'USAGE_LIMIT_EXCEEDED' | 
         'INVALID_CREDENTIALS' | 'SERVICE_UNAVAILABLE' | 'CONFIGURATION_ERROR';
  message: string;
  clientId?: string;
  domain?: string;
  details?: any;
}

// Event types for client lifecycle management
export interface ClientEvent {
  eventId: string;
  clientId: string;
  eventType: 'created' | 'updated' | 'suspended' | 'reactivated' | 'deleted' | 
             'limit_exceeded' | 'error_threshold_reached' | 'payment_failed';
  timestamp: Date;
  metadata: {
    triggeredBy: 'admin' | 'system' | 'client';
    details: any;
  };
}

// Billing and usage reporting types
export interface ClientBillingReport {
  clientId: string;
  organizationName: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  usage: {
    messages: number;
    socialPosts: number;
    databaseQueries: number;
    storageUsed: number; // MB
    bandwidthUsed: number; // MB
  };
  costs: {
    baseSubscription: number;
    overageCharges: number;
    totalAmount: number;
    currency: string;
  };
  tier: 'basic' | 'professional' | 'enterprise';
}

// Configuration validation types
export interface ClientConfigValidation {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    recommendation: string;
  }>;
} 

export interface ClientOnboardingData {
  organizationName: string;
  domains: string[];
  contactEmail: string;
  businessPhoneNumber?: string;
  
  whatsapp: {
    businessPhoneNumber: string;
    webhookToken?: string;
    qrCodeBranding?: {
      logo?: string;
      colors?: {
        primary: string;
        secondary: string;
      };
    };
  };
  
  aiConfig?: {
    systemPrompt?: string;
    fallbackMessage?: string;
    personality?: 'professional' | 'friendly' | 'casual';
  };
  
  socialMedia?: {
    tiktok?: {
      accessToken: string;
      accountId: string;
    };
    instagram?: {
      accessToken: string;
      accountId: string;
    };
    twitter?: {
      apiKey: string;
      apiSecret: string;
      accessToken: string;
      accessTokenSecret: string;
    };
    linkedin?: {
      accessToken: string;
      pageId: string;
    };
  };
  
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
    connectionString: string;
    schema?: string;
    poolSize?: number;
  };
  
  limits?: {
    messagesPerDay?: number;
    socialPostsPerDay?: number;
    databaseQueriesPerDay?: number;
  };
  
  billingTier?: 'basic' | 'professional' | 'enterprise';
}