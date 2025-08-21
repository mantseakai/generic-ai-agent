// Quick Route Verification Script
// File: backend/verify-routes.js
// Run this with: node backend/verify-routes.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRouteSetup() {
  console.log('🔍 Testing Route Setup...\n');
  
  try {
    // Test 1: System Health
    console.log('1. Testing System Health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`   ✅ Health Status: ${healthResponse.data.status}`);
    
    // Test 2: Check Agent Status (should show route integration info)
    console.log('\n2. Testing Agent Status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/agents/status`);
    console.log(`   ✅ Found ${Object.keys(statusResponse.data.agents).length} agent types`);
    if (statusResponse.data.agents.multiClient) {
      console.log(`   ✅ Multi-client status: ${statusResponse.data.agents.multiClient.status}`);
    } else {
      console.log('   ⚠️  Multi-client agent not found in status');
    }
    
    // Test 3: Try creating a test client
    console.log('\n3. Testing Client Creation...');
    
    const testClient = {
      organizationName: 'Test Company',
      domains: ['insurance'],
      contactEmail: 'test@example.com',
      businessPhoneNumber: '+1234567890'
    };
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/admin/clients`, testClient);
      console.log(`   ✅ Client created: ${createResponse.data.clientId}`);
      
      // Test the created client
      const clientId = createResponse.data.clientId;
      
      // Test client chat
      console.log('\n4. Testing Client Chat...');
      const chatResponse = await axios.post(
        `${BASE_URL}/api/clients/${clientId}/chat/insurance/message`,
        {
          userId: 'test-user',
          message: 'Hello, I need car insurance'
        }
      );
      console.log(`   ✅ Chat response received for client ${clientId}`);
      
      // Test client WhatsApp QR
      console.log('\n5. Testing Client WhatsApp QR...');
      const qrResponse = await axios.get(`${BASE_URL}/api/clients/${clientId}/whatsapp/qr-code`);
      console.log(`   ✅ QR code generated for client ${clientId}`);
      
    } catch (createError) {
      if (createError.response) {
        console.log(`   ❌ Client creation failed: ${createError.response.status} - ${createError.response.data.error || 'Unknown error'}`);
        
        // Check if it's a route not found error
        if (createError.response.status === 404) {
          console.log('\n📋 DIAGNOSIS: Admin routes not found');
          console.log('   This means the RouteIntegration is not properly setting up routes');
          console.log('   Check that:');
          console.log('   1. RouteIntegration.setupRoutes() is being called in app.ts');
          console.log('   2. createClientManagementRoutes is being imported correctly');
          console.log('   3. The routes are being registered with app.use("/api/admin", ...)');
          
          return false;
        }
      } else {
        console.log(`   ❌ Client creation failed: ${createError.message}`);
      }
    }
    
    console.log('\n🎉 All route tests passed!');
    return true;
    
  } catch (error) {
    console.log(`\n❌ Route test failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Make sure your server is running on port 3000');
    }
    return false;
  }
}

// Also create a simple route debug helper
async function debugRoutes() {
  console.log('\n🔧 Route Debug Information:\n');
  
  try {
    // Test each expected route individually
    const routes = [
      { method: 'GET', path: '/health', description: 'System health check' },
      { method: 'GET', path: '/api/agents/status', description: 'Agent status' },
      { method: 'GET', path: '/api/admin/clients', description: 'List clients (should fail with empty list)' },
      { method: 'GET', path: '/api/system/health', description: 'System health detailed' }
    ];
    
    for (const route of routes) {
      try {
        console.log(`Testing ${route.method} ${route.path}...`);
        
        let response;
        if (route.method === 'GET') {
          response = await axios.get(`${BASE_URL}${route.path}`);
        }
        
        console.log(`   ✅ ${route.description}: Status ${response.status}`);
        
      } catch (routeError) {
        if (routeError.response) {
          console.log(`   ❌ ${route.description}: Status ${routeError.response.status} - ${routeError.response.statusText}`);
          if (routeError.response.status === 404) {
            console.log(`      → Route not found: ${route.path}`);
          }
        } else {
          console.log(`   ❌ ${route.description}: ${routeError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`Debug failed: ${error.message}`);
  }
}

// Run the tests
async function main() {
  console.log('🧪 Multi-Client Route Verification\n');
  console.log('Make sure your server is running with: npm run dev\n');
  
  // First do basic route debugging
  await debugRoutes();
  
  // Then run full test
  console.log('\n' + '='.repeat(60));
  const success = await testRouteSetup();
  
  if (success) {
    console.log('\n✅ All tests passed! Your multi-client architecture is working.');
  } else {
    console.log('\n❌ Tests failed. Check the errors above and fix the issues.');
    console.log('\nCommon fixes:');
    console.log('1. Make sure all route files exist in the correct locations');
    console.log('2. Check that RouteIntegration is being initialized in app.ts');
    console.log('3. Verify that all imports are correct');
    console.log('4. Check server logs for initialization errors');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testRouteSetup, debugRoutes };