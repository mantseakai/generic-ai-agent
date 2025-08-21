import { AIService } from './services/AIService';
// Final Corrected App.ts - With Backward Compatibility
// File: backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import your existing routes (PRESERVED)
import apiRoutes from './routes';
import genericInsuranceRoutes from './routes/genericInsuranceChat';

// Import Multi-Client Route Integration (NEW)
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
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Logging
app.use(morgan('combined'));

// Initialize Multi-Client Route Integration
const routeIntegration = new RouteIntegration();
let multiClientReady = false;

// CRITICAL FIX: Ensure ALL routes are configured before the server starts
async function startServer() {
  try {
    console.log('🚀 Initializing Multi-Client System...');
    await routeIntegration.initialize();
    
    // Step 1: Register the new, specific multi-client routes FIRST
    routeIntegration.setupRoutes(app);
    
    multiClientReady = true;
    console.log('✅ Multi-Client System Ready!');
    
    // Step 2: Register the legacy routes SECOND, AFTER the multi-client ones
    app.use('/api', apiRoutes);
    app.use('/api/generic/insurance', genericInsuranceRoutes);
    
    // Health check endpoint
    app.get('/health', async (req, res) => {
      try {
        let multiClientHealth = null;
        if (multiClientReady) {
          try {
            multiClientHealth = await routeIntegration.getSystemHealth();
          } catch (error) {
            console.log('Multi-client health check failed:', (error as Error).message);
          }
        }
        const clientCount = routeIntegration.getClientManager().getTotalClientCount();
        const agents = {
          original: { type: 'insurance', endpoint: '/api/chat/message', status: 'active' },
          generic: { type: 'insurance', endpoint: '/api/generic/insurance/message', status: 'testing' },
          multiClient: multiClientHealth ? {
            type: 'multi-domain',
            endpoints: [
              '/api/clients/:clientId/chat/:domain/message',
              '/api/clients/:clientId/whatsapp/qr-code',
              '/api/admin/clients'
            ],
            status: multiClientHealth.status === 'healthy' ? 'active' : 'initializing',
            features: [
              'multi_client_isolation',
              'client_specific_branding', 
              'domain_agnostic_ai',
              'scalable_architecture',
              'usage_analytics'
            ],
            clients: clientCount
          } : {
            status: multiClientReady ? 'error' : 'not_initialized',
            error: multiClientReady ? 'Health check failed' : 'Multi-client system not initialized'
          }
        };
        res.status(200).json({
          success: true,
          status: 'OK',
          multiClient: {
            ...agents.multiClient,
            status: multiClientHealth?.status || 'not_initialized'
          },
          migration_status: multiClientReady ? 'multi_client_architecture_ready' : 'legacy_mode',
          backward_compatibility: 'fully_maintained',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.json({
          success: true,
          agents: {
            original: { type: 'insurance', endpoint: '/api/chat/message', status: 'active' },
            generic: { type: 'insurance', endpoint: '/api/generic/insurance/message', status: 'testing' },
            multiClient: { status: 'error', error: 'Status endpoint failed' }
          },
          migration_status: 'legacy_mode',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Error handling middleware (PRESERVED)
    app.use(notFound);
    app.use(errorHandler);

    // Get the port from environment variables or use a default
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🎉 Server is running on port ${PORT}`);
      console.log('--- Server ready to handle requests ---');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.log('⚠️ Server will not start due to initialization failure.');
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;