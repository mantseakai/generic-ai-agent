// File: frontend/src/services/api.ts - UPDATED WITH MULTI-CLIENT SUPPORT

import axios from 'axios';

// Configure base axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
    return Promise.reject(error);
  }
);

// Utility function for retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 408 (timeout)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 408) {
        throw error;
      }
      
      if (attempt <= maxRetries) {
        console.log(`🔄 Retrying operation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

// ===== ORIGINAL CHAT API (PRESERVED) =====
export const chatAPI = {
  sendMessage: async (message: string, userId: string, context: any = {}) => {
    const startTime = Date.now();
    console.log(`💬 Sending message: "${message.substring(0, 50)}..." for user: ${userId}`);
    
    try {
      const response = await api.post('/chat/message', {
        message,
        userId,
        context
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Chat response received in ${duration}ms`);
      
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Chat Error after ${duration}ms:`, error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('The AI is taking longer than usual to respond. Please check your internet connection and try again.');
      }
      
      if (error.response?.status >= 500) {
        throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      
      const fallbackMessage = error.response?.data?.error || 
                             error.response?.data?.message || 
                             'An unexpected error occurred. Please try again.';
      throw new Error(fallbackMessage);
    }
  },

  getHistory: async (userId: string) => {
    try {
      const response = await api.get(`/chat/history/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Chat History Error:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout loading chat history. Please try again.');
      }
      
      throw new Error(error.response?.data?.error || 'Failed to load chat history');
    }
  },

  healthCheck: async () => {
    try {
      const response = await api.get('/chat/health');
      return response.data;
    } catch (error: any) {
      console.error('❌ Health Check Error:', error);
      throw new Error('Service health check failed');
    }
  },

  sendMessageGeneric: async (message: string, userId: string, domain: string = 'insurance', context: any = {}) => {
    const startTime = Date.now();
    console.log(`🔄 Sending generic message: "${message.substring(0, 50)}..." for domain: ${domain}`);
    
    try {
      const response = await api.post('/generic/insurance/message', {
        message,
        userId,
        domain,
        context
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Generic response received in ${duration}ms`);
      
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Generic Chat Error after ${duration}ms:`, error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Generic AI is taking longer than usual. Please try again.');
      }
      
      const fallbackMessage = error.response?.data?.error || 
                             error.response?.data?.message || 
                             'Generic AI service error. Please try again.';
      throw new Error(fallbackMessage);
    }
  },

  compareAgents: async (message: string, userId: string, context: any = {}) => {
    const startTime = Date.now();
    console.log(`🔄 Comparing agents for message: "${message.substring(0, 50)}..."`);
    
    try {
      const response = await api.post('/generic/insurance/compare', {
        message,
        userId: `compare_${Date.now()}`,
        context
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Agent comparison completed in ${duration}ms`);
      
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Agent Comparison Error after ${duration}ms:`, error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Agent comparison is taking longer than usual. Please try again.');
      }
      
      throw new Error(error.response?.data?.error || 'Failed to compare agents');
    }
  },

  getAgentStatus: async () => {
    try {
      const response = await api.get('/agents/status');
      return response.data;
    } catch (error: any) {
      console.error('❌ Agent Status Error:', error);
      throw new Error('Failed to get agent status');
    }
  }
};

// ===== NEW: MULTI-CLIENT API =====
export const multiClientAPI = {
  // Admin endpoints
  listClients: async () => {
    try {
      console.log('📋 Fetching client list...');
      const response = await api.get('/admin/clients');
      console.log(`✅ Found ${response.data.data?.clients?.length || 0} clients`);
      return response.data;
    } catch (error: any) {
      console.error('❌ List Clients Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch clients');
    }
  },

  createClient: async (clientData: {
    organizationName: string;
    domains: string[];
    contactEmail: string;
    whatsapp?: { businessPhoneNumber: string };
    industry?: string;
  }) => {
    try {
      console.log(`🏢 Creating client: ${clientData.organizationName}`);
      const response = await api.post('/admin/clients', clientData);
      console.log(`✅ Client created: ${response.data.clientId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Create Client Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create client');
    }
  },

  updateClient: async (clientId: string, updates: any) => {
    try {
      console.log(`🔄 Updating client: ${clientId}`);
      const response = await api.put(`/admin/clients/${clientId}`, updates);
      console.log(`✅ Client updated: ${clientId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Update Client Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to update client');
    }
  },

  deleteClient: async (clientId: string) => {
    try {
      console.log(`🗑️ Deleting client: ${clientId}`);
      const response = await api.delete(`/admin/clients/${clientId}`);
      console.log(`✅ Client deleted: ${clientId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Delete Client Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete client');
    }
  },

  getClient: async (clientId: string) => {
    try {
      console.log(`📖 Fetching client details: ${clientId}`);
      const response = await api.get(`/admin/clients/${clientId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get Client Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch client details');
    }
  },

  // Client chat endpoints
  sendMessage: async (clientId: string, domain: string, message: string, userId: string, context: any = {}) => {
    const startTime = Date.now();
    console.log(`💬 Multi-client message: ${clientId}/${domain} - "${message.substring(0, 50)}..."`);
    
    try {
      const response = await api.post(`/clients/${clientId}/chat/${domain}/message`, {
        message,
        userId,
        context: {
          ...context,
          source: 'multi_client_frontend'
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Multi-client response received in ${duration}ms`);
      
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Multi-client Chat Error after ${duration}ms:`, error);
      
      if (error.response?.status === 404) {
        throw new Error(`Client or domain not found: ${clientId}/${domain}`);
      }
      
      if (error.response?.status === 429) {
        throw new Error('Daily message limit exceeded for this client');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('The AI is taking longer than usual to respond. Please try again.');
      }
      
      const fallbackMessage = error.response?.data?.error || 
                             error.response?.data?.message || 
                             'Multi-client AI service error. Please try again.';
      throw new Error(fallbackMessage);
    }
  },

  getChatContext: async (clientId: string, domain: string, userId: string) => {
    try {
      console.log(`📝 Fetching chat context: ${clientId}/${domain}/${userId}`);
      const response = await api.get(`/clients/${clientId}/chat/${domain}/context`, {
        params: { userId }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Get Chat Context Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch chat context');
    }
  },

  // WhatsApp endpoints
  getWhatsAppQR: async (clientId: string, type: string = 'general', size: string = '300') => {
    try {
      console.log(`📱 Getting WhatsApp QR for client: ${clientId}`);
      const qrUrl = `/clients/${clientId}/whatsapp/qr-code?type=${type}&size=${size}`;
      return { qrUrl: api.defaults.baseURL?.replace('/api', '') + '/api' + qrUrl };
    } catch (error: any) {
      console.error('❌ WhatsApp QR Error:', error);
      throw new Error('Failed to generate WhatsApp QR code');
    }
  },

  getWhatsAppQRHTML: async (clientId: string, type: string = 'general', size: string = '300') => {
    try {
      console.log(`📱 Getting WhatsApp QR HTML for client: ${clientId}`);
      const htmlUrl = `/clients/${clientId}/whatsapp/qr-code/html?type=${type}&size=${size}`;
      return { htmlUrl: api.defaults.baseURL?.replace('/api', '') + '/api' + htmlUrl };
    } catch (error: any) {
      console.error('❌ WhatsApp QR HTML Error:', error);
      throw new Error('Failed to generate WhatsApp QR HTML');
    }
  },

  getWhatsAppStats: async (clientId: string) => {
    try {
      console.log(`📊 Getting WhatsApp stats for client: ${clientId}`);
      const response = await api.get(`/clients/${clientId}/whatsapp/stats`);
      return response.data;
    } catch (error: any) {
      console.error('❌ WhatsApp Stats Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch WhatsApp statistics');
    }
  },

  // Analytics endpoints
  getAnalytics: async (clientId: string) => {
    try {
      console.log(`📈 Fetching analytics for client: ${clientId}`);
      const response = await api.get(`/clients/${clientId}/analytics/dashboard`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Analytics Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch analytics');
    }
  },

  getUsageMetrics: async (clientId: string, timeframe: string = '7d') => {
    try {
      console.log(`📊 Fetching usage metrics for client: ${clientId} (${timeframe})`);
      const response = await api.get(`/clients/${clientId}/analytics/usage`, {
        params: { timeframe }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Usage Metrics Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch usage metrics');
    }
  }
};

// ===== SYSTEM API =====
export const systemAPI = {
  getHealth: async () => {
    try {
      console.log('🏥 Checking system health...');
      const response = await api.get('/system/health');
      return response.data;
    } catch (error: any) {
      console.error('❌ System Health Error:', error);
      throw new Error('Failed to check system health');
    }
  },

  getAgentStatus: async () => {
    try {
      console.log('🤖 Getting agent status...');
      const response = await api.get('/agents/status');
      return response.data;
    } catch (error: any) {
      console.error('❌ Agent Status Error:', error);
      throw new Error('Failed to get agent status');
    }
  },

  getSystemStatus: async () => {
    try {
      console.log('🔍 Getting system status...');
      // Try the health endpoint first
      const healthResponse = await fetch(api.defaults.baseURL?.replace('/api', '') + '/health');
      if (!healthResponse.ok) throw new Error('Health check failed');
      return await healthResponse.json();
    } catch (error: any) {
      console.error('❌ System Status Error:', error);
      throw new Error('Failed to get system status');
    }
  }
};

// ===== LEGACY LEADS API (PRESERVED) =====
export const leadsAPI = {
  createLead: async (leadData: any) => {
    try {
      console.log('📝 Creating lead...');
      const response = await api.post('/leads', leadData);
      console.log('✅ Lead created successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Create Lead Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create lead');
    }
  },

  getLeads: async () => {
    try {
      const response = await api.get('/leads');
      return response.data;
    } catch (error: any) {
      console.error('❌ Get Leads Error:', error);
      throw new Error('Failed to fetch leads');
    }
  },

  updateLead: async (leadId: string, updates: any) => {
    try {
      const response = await api.put(`/leads/${leadId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('❌ Update Lead Error:', error);
      throw new Error('Failed to update lead');
    }
  }
};

// ===== UTILITY FUNCTIONS =====

// Retry wrapper for any API call
export const sendMessageWithRetry = async (
  message: string, 
  userId: string, 
  agent: 'original' | 'generic' | 'multiClient' = 'original',
  clientId?: string,
  domain: string = 'insurance',
  context: any = {}
) => {
  return withRetry(async () => {
    switch (agent) {
      case 'generic':
        return await chatAPI.sendMessageGeneric(message, userId, domain, context);
      case 'multiClient':
        if (!clientId) throw new Error('Client ID required for multi-client messages');
        return await multiClientAPI.sendMessage(clientId, domain, message, userId, context);
      default:
        return await chatAPI.sendMessage(message, userId, context);
    }
  });
};

// Test all API endpoints
export const testAllEndpoints = async () => {
  const results = {
    originalChat: { status: 'unknown', error: null },
    genericChat: { status: 'unknown', error: null },
    multiClient: { status: 'unknown', error: null },
    systemHealth: { status: 'unknown', error: null }
  };

  // Test original chat
  try {
    await chatAPI.healthCheck();
    results.originalChat.status = 'healthy';
  } catch (error: any) {
    results.originalChat.status = 'error';
    results.originalChat.error = error.message;
  }

  // Test generic chat
  try {
    await chatAPI.sendMessageGeneric('test', 'test_user', 'insurance', {});
    results.genericChat.status = 'healthy';
  } catch (error: any) {
    results.genericChat.status = 'error';
    results.genericChat.error = error.message;
  }

  // Test multi-client system
  try {
    await multiClientAPI.listClients();
    results.multiClient.status = 'healthy';
  } catch (error: any) {
    results.multiClient.status = 'error';
    results.multiClient.error = error.message;
  }

  // Test system health
  try {
    await systemAPI.getSystemStatus();
    results.systemHealth.status = 'healthy';
  } catch (error: any) {
    results.systemHealth.status = 'error';
    results.systemHealth.error = error.message;
  }

  return results;
};

// Export default api instance and all service modules
export default api;