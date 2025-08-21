// Multi-Client AI Agent Server - Complete Setup
// File: backend/src/server.ts

import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('Starting Multi-Client AI Agent Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Multi-client system is initialized in app.ts
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🎉 Multi-Client AI Agent Server is running!');
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log('');
      console.log('📡 API Endpoints Available:');
      console.log('');
      console.log('🔧 Multi-Client Admin:');
      console.log(`   POST   http://localhost:${PORT}/api/admin/clients`);
      console.log(`   GET    http://localhost:${PORT}/api/admin/clients`);
      console.log(`   PUT    http://localhost:${PORT}/api/admin/clients/:clientId`);
      console.log(`   DELETE http://localhost:${PORT}/api/admin/clients/:clientId`);
      console.log('');
      console.log('💬 Multi-Client Chat:');
      console.log(`   POST   http://localhost:${PORT}/api/clients/:clientId/chat/:domain/message`);
      console.log(`   GET    http://localhost:${PORT}/api/clients/:clientId/chat/:domain/context`);
      console.log('');
      console.log('📱 Enhanced WhatsApp (Client-Specific):');
      console.log(`   GET    http://localhost:${PORT}/api/clients/:clientId/whatsapp/qr-code`);
      console.log(`   GET    http://localhost:${PORT}/api/clients/:clientId/whatsapp/qr-code/html`);
      console.log(`   POST   http://localhost:${PORT}/api/clients/:clientId/whatsapp/webhook`);
      console.log('');
      console.log('📊 Analytics & Monitoring:');
      console.log(`   GET    http://localhost:${PORT}/api/clients/:clientId/analytics/dashboard`);
      console.log(`   GET    http://localhost:${PORT}/api/system/health`);
      console.log('');
      console.log('🔄 Backward Compatibility (Preserved):');
      console.log(`   POST   http://localhost:${PORT}/api/chat/message`);
      console.log(`   GET    http://localhost:${PORT}/api/whatsapp/qr-code`);
      console.log(`   POST   http://localhost:${PORT}/api/whatsapp/webhook`);
      console.log(`   GET    http://localhost:${PORT}/api/agents/status`);
      console.log('');
      console.log('🏥 System Health:');
      console.log(`   GET    http://localhost:${PORT}/health`);
      console.log('');
      console.log('Ready for testing! 🚀');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();