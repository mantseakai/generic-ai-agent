// Multi-Client AI Agent App - Complete Integration
// File: backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import your existing routes (preserved for backward compatibility)
import apiRoutes from './routes';
import genericInsuranceRoutes from './routes/genericInsuranceChat';

// Import the new Multi-Client Route Integration
import { RouteIntegration } from './core/routes/integration';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

const app = express();
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'", 
        "data:", 
        "https://chart.googleapis.com",
        "https://api.qrserver.com",
        "blob:"
      ],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Logging
app.use(morgan('combined'));

// Initialize Multi-Client Route Integration
const routeIntegration = new RouteIntegration();

// Health check endpoint - Enhanced with multi-client status
app.get('/health', async (req, res) => {
  try {
    const systemHealth = await routeIntegration.getSystemHealth();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      multiClient: systemHealth,
      agents: {
        original_insurance: 'available',
        generic_insurance: 'available',
        multi_client: systemHealth.status === 'healthy' ? 'available' : 'initializing'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      error: 'Multi-client system not ready'
    });
  }
});

// Initialize and start the multi-client system
async function initializeMultiClientSystem() {
  try {
    console.log('🚀 Initializing Multi-Client AI Agent System...');
    
    // Initialize the multi-client architecture
    await routeIntegration.initialize();
    
    // Setup multi-client routes
    routeIntegration.setupRoutes(app);
    
    console.log('✅ Multi-Client System Ready!');
    console.log('📡 Available Multi-Client Endpoints:');
    console.log('   🔧 POST /api/admin/clients - Create client');
    console.log('   📋 GET /api/admin/clients - List clients');
    console.log('   💬 POST /api/clients/:clientId/chat/:domain/message - Client chat');
    console.log('   📱 GET /api/clients/:clientId/whatsapp/qr-code - Client QR codes');
    console.log('   📊 GET /api/clients/:clientId/analytics/dashboard - Analytics');
    console.log('   🏥 GET /api/system/health - System health');
    
  } catch (error) {
    console.error('❌ Failed to initialize Multi-Client System:', error);
    console.log('⚠️  Continuing with legacy routes only...');
  }
}

// Setup all routes in correct order

// 1. Multi-Client Routes (NEW - highest priority)
// These are initialized by routeIntegration.setupRoutes(app) above

// 2. Legacy Routes (PRESERVED - backward compatibility)
app.use('/api', apiRoutes);
app.use('/api/generic/insurance', genericInsuranceRoutes);

// 3. Agent status endpoint (enhanced with multi-client info)
app.get('/api/agents/status', async (req, res) => {
  try {
    const systemHealth = await routeIntegration.getSystemHealth();
    const clientStats = routeIntegration.getClientManager().getTotalClientCount();
    
    res.json({
      success: true,
      agents: {
        original: {
          type: 'insurance',
          endpoint: '/api/chat/message',
          status: 'active',
          features: ['conversation', 'lead_scoring', 'knowledge_retrieval']
        },
        generic: {
          type: 'insurance',
          endpoint: '/api/generic/insurance/message',
          status: 'testing',
          features: ['conversation', 'lead_scoring', 'knowledge_retrieval', 'business_logic', 'domain_config']
        },
        multiClient: {
          type: 'multi-domain',
          endpoints: [
            '/api/clients/:clientId/chat/:domain/message',
            '/api/clients/:clientId/whatsapp/qr-code',
            '/api/admin/clients'
          ],
          status: systemHealth.status === 'healthy' ? 'active' : 'initializing',
          features: [
            'multi_client_isolation',
            'client_specific_branding', 
            'domain_agnostic_ai',
            'scalable_architecture',
            'usage_analytics'
          ],
          clients: clientStats
        }
      },
      migration_status: 'multi_client_architecture_complete',
      backward_compatibility: 'fully_maintained',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      agents: {
        original: { type: 'insurance', endpoint: '/api/chat/message', status: 'active' },
        generic: { type: 'insurance', endpoint: '/api/generic/insurance/message', status: 'testing' },
        multiClient: { status: 'error', error: 'System not initialized' }
      },
      migration_status: 'legacy_mode',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Export the app
export default app;

// Export initialization function for server.ts
export { initializeMultiClientSystem };