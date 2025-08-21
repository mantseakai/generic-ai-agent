// Multi-Client Vector Store with ChromaDB Isolation - CORRECTED VERSION
// File: backend/src/core/services/MultiClientVectorStore.ts

import { ClientConfig } from '../types/client-types';

// Import ChromaDB with correct syntax
let ChromaApi: any;
let Collection: any;

try {
  const chromadb = require('chromadb');
  ChromaApi = chromadb.ChromaApi;
  Collection = chromadb.Collection;
} catch (error) {
  console.warn('ChromaDB not available, using mock implementation');
}

interface BaseRAGDocument {
  id: string;
  content: string;
  metadata: {
    type: 'product' | 'objection' | 'process' | 'faq' | 'policy';
    category: string;
    subcategory?: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    domain: string; // 'insurance' | 'resort' | 'pension'
    clientId?: string; // For client-specific content
    
    // Generic business fields
    effectiveness?: number; // 0-1 based on historical performance
    lastUpdated: Date;
    tags?: string[];
    seasonalRelevance?: string[];
    locationRelevance?: string[];
    customerSegments?: string[];
    
    // Extension point for domain-specific metadata
    domainSpecific?: Record<string, any>;
  };
  embedding?: number[];
}

interface BaseQueryContext {
  clientId: string;
  domain: string;
  stage?: string;
  customerInfo?: Record<string, any>;
  conversationHistory?: any[];
  urgencyLevel?: 'high' | 'medium' | 'low';
}

interface BaseRAGResult {
  documents: BaseRAGDocument[];
  context: string;
  confidence: number;
  relevanceScore: number;
  metadata: {
    hasProductInfo: boolean;
    hasObjectionHandling: boolean;
    hasProcessInfo: boolean;
    hasDomainLogic: boolean;
    clientSpecific: boolean;
    domainMatch: number; // 0-1 how well docs match domain
    sourceBreakdown: {
      clientSpecific: number;
      domainSpecific: number;
      coreKnowledge: number;
    };
  };
}

export class MultiClientVectorStore {
  private chromaClient: any;
  private clientCollections: Map<string, Map<string, any>> = new Map(); // clientId -> domain -> collection
  private coreCollections: Map<string, any> = new Map(); // domain -> core collection
  private sharedCollection: any; // Cross-domain shared knowledge
  private embeddingService: EmbeddingService;

  constructor() {
    if (ChromaApi) {
      this.chromaClient = new ChromaApi({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });
    } else {
      // Mock implementation for development
      this.chromaClient = new MockChromaClient();
    }
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize the multi-client vector store system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Multi-Client Vector Store...');

    try {
      // Create shared collection for cross-domain knowledge
      this.sharedCollection = await this.chromaClient.createCollection({
        name: 'shared_knowledge',
        metadata: { 
          type: 'shared', 
          description: 'Cross-domain business knowledge shared across all clients',
          createdAt: new Date().toISOString()
        }
      });

      // Initialize core domain collections (shared across clients)
      const coreDomains = ['insurance', 'resort', 'pension'];
      for (const domain of coreDomains) {
        const collection = await this.chromaClient.createCollection({
          name: `core_${domain}_knowledge`,
          metadata: { 
            type: 'core_domain', 
            domain,
            description: `Core ${domain} knowledge shared across clients`,
            createdAt: new Date().toISOString()
          }
        });
        this.coreCollections.set(domain, collection);
      }

      // Load existing vector data from your current enhanced_vector_default.json
      await this.migrateExistingVectors();

      console.log('Multi-Client Vector Store initialized');
      
    } catch (error) {
      console.error('Failed to initialize Multi-Client Vector Store:', error);
      throw error;
    }
  }

  /**
   * Initialize vector collections for a new client
   */
  async initializeClient(clientId: string, domains: string[]): Promise<void> {
    console.log(`Initializing vector store for client ${clientId} with domains: ${domains.join(', ')}`);

    try {
      const clientDomainCollections = new Map<string, any>();

      for (const domain of domains) {
        // Create client-specific collection for this domain
        const collectionName = `${clientId}_${domain}_knowledge`;
        
        const collection = await this.chromaClient.createCollection({
          name: collectionName,
          metadata: { 
            type: 'client_specific',
            clientId,
            domain,
            createdAt: new Date().toISOString(),
            description: `Client-specific ${domain} knowledge for ${clientId}`
          }
        });

        clientDomainCollections.set(domain, collection);
        console.log(`Created collection: ${collectionName}`);
      }

      this.clientCollections.set(clientId, clientDomainCollections);
      
      // Initialize with some default content if needed
      await this.initializeDefaultClientContent(clientId, domains);

    } catch (error) {
      console.error(`Failed to initialize client ${clientId} vector store:`, error);
      throw error;
    }
  }

  /**
   * Query vectors with client and domain isolation
   */
  async query(query: string, context: BaseQueryContext): Promise<BaseRAGResult> {
    const { clientId, domain } = context;
    const results: BaseRAGDocument[] = [];
    let sourceBreakdown = { clientSpecific: 0, domainSpecific: 0, coreKnowledge: 0 };

    try {
      // 1. Search client-specific collection first (highest priority)
      const clientResults = await this.searchClientSpecific(clientId, domain, query, 5);
      results.push(...clientResults);
      sourceBreakdown.clientSpecific = clientResults.length;

      // 2. Search core domain collection (medium priority)
      const coreResults = await this.searchCoreDomain(domain, query, 3);
      results.push(...coreResults);
      sourceBreakdown.domainSpecific = coreResults.length;

      // 3. Search shared knowledge (low priority)
      const sharedResults = await this.searchSharedKnowledge(query, 2);
      results.push(...sharedResults);
      sourceBreakdown.coreKnowledge = sharedResults.length;

      // 4. Re-rank and merge results based on relevance and context
      const rankedResults = await this.rankResults(results, query, context);

      return {
        documents: rankedResults,
        context: this.buildContext(rankedResults),
        confidence: this.calculateConfidence(rankedResults),
        relevanceScore: this.calculateRelevance(rankedResults, query),
        metadata: {
          hasProductInfo: rankedResults.some(doc => doc.metadata.type === 'product'),
          hasObjectionHandling: rankedResults.some(doc => doc.metadata.type === 'objection'),
          hasProcessInfo: rankedResults.some(doc => doc.metadata.type === 'process'),
          hasDomainLogic: rankedResults.some(doc => doc.metadata.domain === domain),
          clientSpecific: rankedResults.some(doc => doc.metadata.clientId === clientId),
          domainMatch: this.calculateDomainMatch(rankedResults, domain),
          sourceBreakdown
        }
      };

    } catch (error) {
      console.error(`Vector query failed for client ${clientId}, domain ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Add client-specific document to vector store
   */
  async addClientDocument(clientId: string, domain: string, document: BaseRAGDocument): Promise<void> {
    const clientCollections = this.clientCollections.get(clientId);
    if (!clientCollections) {
      throw new Error(`Client ${clientId} not initialized in vector store`);
    }

    const collection = clientCollections.get(domain);
    if (!collection) {
      throw new Error(`Domain ${domain} not available for client ${clientId}`);
    }

    try {
      // Ensure client-specific metadata
      document.metadata.clientId = clientId;
      document.metadata.domain = domain;

      // Generate embedding if not provided
      if (!document.embedding) {
        document.embedding = await this.embeddingService.generateEmbedding(document.content);
      }

      await collection.add({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata],
        embeddings: [document.embedding]
      });

      console.log(`Added document ${document.id} to client ${clientId}, domain ${domain}`);

    } catch (error) {
      console.error(`Failed to add document for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Add document to core domain knowledge (shared across clients)
   */
  async addCoreDomainDocument(domain: string, document: BaseRAGDocument): Promise<void> {
    const collection = this.coreCollections.get(domain);
    if (!collection) {
      throw new Error(`Core domain ${domain} not available`);
    }

    try {
      // Ensure core domain metadata
      document.metadata.domain = domain;
      delete document.metadata.clientId; // Remove client specificity

      // Generate embedding if not provided
      if (!document.embedding) {
        document.embedding = await this.embeddingService.generateEmbedding(document.content);
      }

      await collection.add({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata],
        embeddings: [document.embedding]
      });

      console.log(`Added document ${document.id} to core ${domain} knowledge`);

    } catch (error) {
      console.error(`Failed to add core domain document:`, error);
      throw error;
    }
  }

  /**
   * Update document effectiveness based on user feedback
   */
  async updateDocumentEffectiveness(
    clientId: string, 
    domain: string, 
    documentId: string, 
    feedback: 'helpful' | 'not_helpful'
  ): Promise<void> {
    try {
      const effectivenessChange = feedback === 'helpful' ? 0.1 : -0.05;
      
      // Try client-specific collection first
      const clientCollections = this.clientCollections.get(clientId);
      if (clientCollections) {
        const collection = clientCollections.get(domain);
        if (collection) {
          await this.updateDocumentMetadata(collection, documentId, {
            effectiveness: effectivenessChange,
            lastFeedback: new Date(),
            feedbackType: feedback
          });
          return;
        }
      }

      // Fall back to core domain collection
      const coreCollection = this.coreCollections.get(domain);
      if (coreCollection) {
        await this.updateDocumentMetadata(coreCollection, documentId, {
          effectiveness: effectivenessChange,
          lastFeedback: new Date(),
          feedbackType: feedback
        });
      }

    } catch (error) {
      console.error(`Failed to update document effectiveness:`, error);
    }
  }

  /**
   * Get client-specific analytics
   */
  async getClientAnalytics(clientId: string): Promise<any> {
    const clientCollections = this.clientCollections.get(clientId);
    if (!clientCollections) {
      throw new Error(`Client ${clientId} not found in vector store`);
    }

    const analytics = {
      clientId,
      totalDocuments: 0,
      documentsByDomain: {} as Record<string, number>,
      averageEffectiveness: 0,
      lastUpdated: new Date(),
      domainBreakdown: [] as Array<{
        domain: string;
        documentCount: number;
        lastActivity: Date;
      }>
    };

    for (const [domain, collection] of clientCollections) {
      try {
        const collectionInfo = await collection.count();
        analytics.totalDocuments += collectionInfo;
        analytics.documentsByDomain[domain] = collectionInfo;
        
        analytics.domainBreakdown.push({
          domain,
          documentCount: collectionInfo,
          lastActivity: await this.getLastActivityForDomain(clientId, domain)
        });

      } catch (error) {
        console.error(`Failed to get analytics for ${clientId}/${domain}:`, error);
      }
    }

    return analytics;
  }

  /**
   * Cleanup client resources
   */
  async cleanupClient(clientId: string): Promise<void> {
    const clientCollections = this.clientCollections.get(clientId);
    if (!clientCollections) {
      console.warn(`Client ${clientId} not found for cleanup`);
      return;
    }

    try {
      // Delete all client-specific collections
      for (const [domain, collection] of clientCollections) {
        await this.chromaClient.deleteCollection({
          name: `${clientId}_${domain}_knowledge`
        });
        console.log(`Deleted collection for client ${clientId}, domain ${domain}`);
      }

      // Remove from memory
      this.clientCollections.delete(clientId);

      console.log(`Cleaned up vector store for client ${clientId}`);

    } catch (error) {
      console.error(`Failed to cleanup client ${clientId}:`, error);
      throw error;
    }
  }

  /**
 * Compatibility method for CoreAIService
 * Maps to the main query method with proper formatting
 */
async searchSimilar(
  clientId: string, 
  query: string, 
  domain: string, 
  maxResults: number = 5
): Promise<Array<{ document: string; metadata: any; similarity: number }>> {
  try {
    const result = await this.query(query, {
      clientId,
      domain,
      stage: 'active',
      urgencyLevel: 'medium'
    });

    // Transform the result to match the expected format
    return result.documents.slice(0, maxResults).map(doc => ({
      document: doc.content,
      metadata: doc.metadata,
      similarity: result.relevanceScore
    }));

  } catch (error) {
    console.error('searchSimilar compatibility method failed:', error);
    return [];
  }
}

/**
 * Add document method with simplified parameters
 * Maps to addClientDocument
 */
async addDocument(
  clientId: string, 
  document: { content: string; metadata: any }, 
  domain: string
): Promise<void> {
  const baseDocument: BaseRAGDocument = {
    id: `${clientId}_${domain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: document.content,
    metadata: {
      type: document.metadata.type || 'faq',
      category: document.metadata.category || 'general',
      priority: document.metadata.priority || 'medium',
      domain,
      clientId,
      lastUpdated: new Date(),
      tags: document.metadata.tags || [],
      effectiveness: document.metadata.effectiveness || 0.7,
      ...document.metadata
    }
  };

  await this.addClientDocument(clientId, domain, baseDocument);
}

/**
 * Health check method for system monitoring
 */
async healthCheck(): Promise<{ status: string; details: any }> {
  try {
    // Check if ChromaDB is responding
    if (this.chromaClient && typeof this.chromaClient.listCollections === 'function') {
      await this.chromaClient.listCollections();
    }

    // Check collections status
    const status = {
      status: 'healthy',
      details: {
        sharedCollection: this.sharedCollection ? 'available' : 'unavailable',
        coreCollections: this.coreCollections.size,
        clientCollections: this.clientCollections.size,
        totalClients: this.clientCollections.size,
        timestamp: new Date().toISOString()
      }
    };

    return status;

  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Shutdown method for graceful cleanup
 */
async shutdown(): Promise<void> {
  console.log('Shutting down MultiClientVectorStore...');
  
  try {
    // Clear memory structures
    this.clientCollections.clear();
    this.coreCollections.clear();
    
    // Close ChromaDB connections if needed
    // Note: ChromaDB client doesn't have a specific close method
    // but we can null the reference
    this.chromaClient = null;
    this.sharedCollection = null;
    
    console.log('MultiClientVectorStore shutdown complete');
    
  } catch (error) {
    console.error('Error during MultiClientVectorStore shutdown:', error);
    throw error;
  }
}

  // Private helper methods

  private async searchClientSpecific(clientId: string, domain: string, query: string, maxResults: number): Promise<BaseRAGDocument[]> {
    const clientCollections = this.clientCollections.get(clientId);
    if (!clientCollections) return [];

    const collection = clientCollections.get(domain);
    if (!collection) return [];

    return await this.searchCollection(collection, query, maxResults);
  }

  private async searchCoreDomain(domain: string, query: string, maxResults: number): Promise<BaseRAGDocument[]> {
    const collection = this.coreCollections.get(domain);
    if (!collection) return [];

    return await this.searchCollection(collection, query, maxResults);
  }

  private async searchSharedKnowledge(query: string, maxResults: number): Promise<BaseRAGDocument[]> {
    return await this.searchCollection(this.sharedCollection, query, maxResults);
  }

  private async searchCollection(collection: any, query: string, maxResults: number): Promise<BaseRAGDocument[]> {
    try {
      const results = await collection.query({
        queryTexts: [query],
        nResults: maxResults
      });

      if (!results.documents || !results.documents[0]) {
        return [];
      }

      return results.documents[0].map((content: string, index: number) => ({
        id: results.ids[0][index],
        content,
        metadata: results.metadatas[0][index] as any,
        embedding: results.embeddings?.[0]?.[index]
      }));

    } catch (error) {
      console.error('Collection search failed:', error);
      return [];
    }
  }

  private async rankResults(results: BaseRAGDocument[], query: string, context: BaseQueryContext): Promise<BaseRAGDocument[]> {
    // Enhanced ranking algorithm considering:
    // 1. Client-specific content (highest priority)
    // 2. Domain relevance
    // 3. Effectiveness scores
    // 4. Recency
    // 5. Context matching

    return results
      .map(doc => ({
        ...doc,
        rankingScore: this.calculateRankingScore(doc, query, context)
      }))
      .sort((a: any, b: any) => b.rankingScore - a.rankingScore)
      .slice(0, 10); // Return top 10 results
  }

  private calculateRankingScore(doc: BaseRAGDocument, query: string, context: BaseQueryContext): number {
    let score = 0;

    // Client-specific bonus (highest priority)
    if (doc.metadata.clientId === context.clientId) {
      score += 50;
    }

    // Domain matching bonus
    if (doc.metadata.domain === context.domain) {
      score += 30;
    }

    // Effectiveness bonus
    if (doc.metadata.effectiveness) {
      score += doc.metadata.effectiveness * 20;
    }

    // Priority bonus
    const priorityScores: Record<string, number> = { critical: 15, high: 10, medium: 5, low: 0 };
    score += priorityScores[doc.metadata.priority] || 0;

    // Recency bonus (favor recent content)
    const daysSinceUpdate = (Date.now() - new Date(doc.metadata.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += Math.max(0, 10 - daysSinceUpdate / 3);
    }

    // Context matching bonuses
    if (context.stage && doc.metadata.tags?.includes(context.stage)) {
      score += 5;
    }

    if (context.urgencyLevel && doc.metadata.tags?.includes(context.urgencyLevel)) {
      score += 5;
    }

    return score;
  }

  private buildContext(documents: BaseRAGDocument[]): string {
    return documents
      .map(doc => doc.content)
      .join('\n\n---\n\n')
      .substring(0, 2000); // Limit context size
  }

  private calculateConfidence(documents: BaseRAGDocument[]): number {
    if (documents.length === 0) return 0;

    const avgEffectiveness = documents
      .filter(doc => doc.metadata.effectiveness)
      .reduce((sum, doc) => sum + (doc.metadata.effectiveness || 0), 0) / documents.length;

    const hasClientSpecific = documents.some(doc => doc.metadata.clientId);
    const hasDomainSpecific = documents.some(doc => doc.metadata.domain);

    let confidence = avgEffectiveness * 0.6;
    if (hasClientSpecific) confidence += 0.3;
    if (hasDomainSpecific) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateRelevance(documents: BaseRAGDocument[], query: string): number {
    // Simple relevance calculation based on keyword matching
    // In production, use more sophisticated semantic similarity
    const queryWords = query.toLowerCase().split(' ');
    
    const relevanceScores = documents.map(doc => {
      const contentWords = doc.content.toLowerCase().split(' ');
      const matches = queryWords.filter(word => contentWords.includes(word));
      return matches.length / queryWords.length;
    });

    return relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length 
      : 0;
  }

  private calculateDomainMatch(documents: BaseRAGDocument[], domain: string): number {
    if (documents.length === 0) return 0;
    
    const domainMatches = documents.filter(doc => doc.metadata.domain === domain).length;
    return domainMatches / documents.length;
  }

  private async updateDocumentMetadata(collection: any, documentId: string, updates: any): Promise<void> {
    // Implementation depends on ChromaDB's update capabilities
    // This is a placeholder for metadata updates
    console.log(`Updating metadata for document ${documentId}:`, updates);
  }

  private async getLastActivityForDomain(clientId: string, domain: string): Promise<Date> {
    // Implementation to track last activity per domain
    // For now, return current date - implement proper tracking
    return new Date();
  }

  private async migrateExistingVectors(): Promise<void> {
    // Migrate your existing enhanced_vector_default.json data
    // This preserves your current vector investments
    console.log('Migrating existing vector data...');
    
    try {
      // Load existing vectors (your current file)
      const fs = require('fs').promises;
      const path = require('path');
      
      const vectorFilePath = path.join(__dirname, '../../../data/enhanced_vector_default.json');
      const existingVectors = JSON.parse(
        await fs.readFile(vectorFilePath, 'utf8')
      );

      // Analyze and categorize existing vectors by domain
      for (const vectorData of existingVectors) {
        const domain = this.categorizeDomain(vectorData.content);
        const document: BaseRAGDocument = {
          id: vectorData.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: vectorData.content,
          metadata: {
            type: vectorData.metadata?.type || 'faq',
            category: vectorData.metadata?.category || 'general',
            priority: vectorData.metadata?.priority || 'medium',
            domain,
            lastUpdated: new Date(),
            tags: vectorData.metadata?.tags || [],
            effectiveness: vectorData.metadata?.effectiveness || 0.7
          },
          embedding: vectorData.embedding
        };

        // Add to appropriate core domain collection
        await this.addCoreDomainDocument(domain, document);
      }

      console.log('Vector migration completed');

    } catch (error) {
      console.error('Vector migration failed:', error);
      // Continue without migration - not critical for new setup
      console.log('Continuing without vector migration - new clients will start with default content');
    }
  }

  private categorizeDomain(content: string): string {
    const insuranceKeywords = ['premium', 'policy', 'claim', 'coverage', 'deductible', 'auto insurance', 'health insurance', 'life insurance'];
    const resortKeywords = ['accommodation', 'booking', 'room', 'spa', 'resort', 'vacation', 'hotel', 'guest'];
    const pensionKeywords = ['retirement', 'pension', '401k', 'superannuation', 'retirement planning', 'SSNIT'];

    const contentLower = content.toLowerCase();
    
    const insuranceScore = insuranceKeywords.reduce((score, keyword) => 
      score + (contentLower.includes(keyword) ? 1 : 0), 0);
    const resortScore = resortKeywords.reduce((score, keyword) => 
      score + (contentLower.includes(keyword) ? 1 : 0), 0);
    const pensionScore = pensionKeywords.reduce((score, keyword) => 
      score + (contentLower.includes(keyword) ? 1 : 0), 0);

    if (insuranceScore >= resortScore && insuranceScore >= pensionScore) return 'insurance';
    if (resortScore >= pensionScore) return 'resort';
    if (pensionScore > 0) return 'pension';
    
    return 'insurance'; // Default fallback
  }

  private async initializeDefaultClientContent(clientId: string, domains: string[]): Promise<void> {
    // Add some default helpful content for new clients
    const defaultContent: Record<string, BaseRAGDocument[]> = {
      insurance: [
        {
          id: `${clientId}_insurance_welcome`,
          content: "Welcome! I'm here to help you with all your insurance needs. Feel free to ask about our policies, get quotes, or learn about coverage options.",
          metadata: {
            type: 'faq',
            category: 'welcome',
            priority: 'high',
            domain: 'insurance',
            clientId,
            lastUpdated: new Date(),
            tags: ['welcome', 'introduction'],
            effectiveness: 0.9
          }
        }
      ],
      resort: [
        {
          id: `${clientId}_resort_welcome`,
          content: "Welcome to our resort! I can help you with room bookings, activity reservations, spa appointments, and answer any questions about your stay.",
          metadata: {
            type: 'faq',
            category: 'welcome',
            priority: 'high',
            domain: 'resort',
            clientId,
            lastUpdated: new Date(),
            tags: ['welcome', 'introduction'],
            effectiveness: 0.9
          }
        }
      ],
      pension: [
        {
          id: `${clientId}_pension_welcome`,
          content: "Hello! I'm here to assist you with your pension and retirement planning needs. I can help with SSNIT inquiries, benefit calculations, and retirement planning.",
          metadata: {
            type: 'faq',
            category: 'welcome',
            priority: 'high',
            domain: 'pension',
            clientId,
            lastUpdated: new Date(),
            tags: ['welcome', 'introduction'],
            effectiveness: 0.9
          }
        }
      ]
    };

    for (const domain of domains) {
      const domainContent = defaultContent[domain];
      if (domainContent) {
        for (const document of domainContent) {
          await this.addClientDocument(clientId, domain, document);
        }
      }
    }

    console.log(`Added default content for client ${clientId}`);
  }
}

// Embedding Service for generating vector embeddings
class EmbeddingService {
  private openai: any; // OpenAI client for embeddings

  constructor() {
    // Initialize OpenAI client if available
    try {
      const { OpenAI } = require('openai');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      console.warn('OpenAI not available for embeddings, using fallback');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // Fallback to simple hash-based embedding (for development)
      return this.generateSimpleEmbedding(text);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data[0].embedding;

    } catch (error) {
      console.error('Failed to generate OpenAI embedding:', error);
      return this.generateSimpleEmbedding(text);
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple fallback embedding for development/testing
    // In production, always use proper embedding models
    const hash = this.simpleHash(text);
    const embedding = [];
    
    // Generate 1536-dimensional embedding (matching OpenAI's ada-002)
    for (let i = 0; i < 1536; i++) {
      embedding.push((Math.sin(hash * i) + 1) / 2);
    }
    
    return embedding;
  }

  

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / Math.pow(2, 31);
  }
}

// Mock ChromaDB client for development when ChromaDB isn't available
class MockChromaClient {
  private collections = new Map<string, MockCollection>();

  async createCollection(options: any): Promise<MockCollection> {
    const collection = new MockCollection(options.name);
    this.collections.set(options.name, collection);
    return collection;
  }

  async deleteCollection(options: any): Promise<void> {
    this.collections.delete(options.name);
  }
}

class MockCollection {
  private documents: any[] = [];
  
  constructor(private name: string) {}

  async add(data: any): Promise<void> {
    this.documents.push(data);
  }

  async query(options: any): Promise<any> {
    // Simple mock query that returns stored documents
    return {
      documents: [this.documents.map(d => d.documents[0] || '')],
      ids: [this.documents.map(d => d.ids[0] || '')],
      metadatas: [this.documents.map(d => d.metadatas[0] || {})],
      embeddings: [this.documents.map(d => d.embeddings?.[0] || [])]
    };
  }

  async count(): Promise<number> {
    return this.documents.length;
  }
}

