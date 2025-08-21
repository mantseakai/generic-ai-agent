// Multi-Client Architecture Testing Script
// File: backend/test-integration.js (or create as .ts and run with ts-node)

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class MultiClientTester {
  constructor() {
    this.testResults = [];
    this.createdClients = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Multi-Client Architecture Integration Tests\n');
    
    try {
      // Test 1: System Health
      await this.testSystemHealth();
      
      // Test 2: Backward Compatibility
      await this.testBackwardCompatibility();
      
      // Test 3: Client Creation
      await this.testClientCreation();
      
      // Test 4: Multi-Client Chat
      await this.testMultiClientChat();
      
      // Test 5: Client-Specific WhatsApp
      await this.testClientWhatsApp();
      
      // Test 6: Analytics
      await this.testAnalytics();
      
      // Test 7: Admin Operations
      await this.testAdminOperations();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Testing failed:', error.message);
    }
  }

  async testSystemHealth() {
    console.log('🏥 Testing System Health...');
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.logTest('System Health', true, `Status: ${response.data.status}`);
      
      if (response.data.multiClient) {
        this.logTest('Multi-Client Health', true, `Multi-client status: ${response.data.multiClient.status}`);
      }
      
    } catch (error) {
      this.logTest('System Health', false, error.message);
    }
  }

  async testBackwardCompatibility() {
    console.log('🔄 Testing Backward Compatibility...');
    
    try {
      // Test legacy chat endpoint
      const chatResponse = await axios.post(`${BASE_URL}/api/chat/message`, {
        userId: 'test-legacy-user',
        message: 'Hello from legacy endpoint'
      });
      
      this.logTest('Legacy Chat Endpoint', true, 'Legacy chat works');
      
      // Test legacy WhatsApp QR
      const qrResponse = await axios.get(`${BASE_URL}/api/whatsapp/qr-code`);
      this.logTest('Legacy WhatsApp QR', true, 'Legacy QR generation works');
      
      // Test agent status
      const statusResponse = await axios.get(`${BASE_URL}/api/agents/status`);
      this.logTest('Agent Status', true, `Found ${Object.keys(statusResponse.data.agents).length} agents`);
      
    } catch (error) {
      this.logTest('Backward Compatibility', false, error.message);
    }
  }

  async testClientCreation() {
    console.log('🔧 Testing Client Creation...');
    
    const testClients = [
      {
        organizationName: 'ABC Insurance Company',
        domains: ['insurance'],
        contactEmail: 'admin@abc-insurance.com',
        businessPhoneNumber: '+1234567890',
        industry: 'insurance'
      },
      {
        organizationName: 'BigBlue Resort & Spa',
        domains: ['resort'],
        contactEmail: 'admin@bigblue-resort.com',
        businessPhoneNumber: '+1234567891',
        industry: 'hospitality'
      },
      {
        organizationName: 'SSNIT Pension Services',
        domains: ['pension'],
        contactEmail: 'admin@ssnit.gov.gh',
        businessPhoneNumber: '+233123456789',
        industry: 'government'
      }
    ];

    for (const clientData of testClients) {
      try {
        const response = await axios.post(`${BASE_URL}/api/admin/clients`, clientData);
        
        if (response.data.success) {
          this.createdClients.push(response.data.data);
          this.logTest(`Create Client: ${clientData.organizationName}`, true, 
            `Client ID: ${response.data.data.clientId}`);
        } else {
          this.logTest(`Create Client: ${clientData.organizationName}`, false, 
            response.data.error || 'Unknown error');
        }
        
      } catch (error) {
        this.logTest(`Create Client: ${clientData.organizationName}`, false, error.response?.data?.error || error.message);
      }
    }
  }

  async testMultiClientChat() {
    console.log('💬 Testing Multi-Client Chat...');
    
    for (const client of this.createdClients) {
      const domain = client.domains[0];
      
      try {
        const response = await axios.post(
          `${BASE_URL}/api/clients/${client.clientId}/chat/${domain}/message`,
          {
            userId: `test-user-${client.clientId}`,
            message: `Hello from ${client.organizationName}! I need help with ${domain}.`
          }
        );
        
        if (response.data.success) {
          this.logTest(`Chat: ${client.organizationName}`, true, 
            `Response received for ${domain} domain`);
        } else {
          this.logTest(`Chat: ${client.organizationName}`, false, 
            response.data.error || 'Chat failed');
        }
        
      } catch (error) {
        this.logTest(`Chat: ${client.organizationName}`, false, 
          error.response?.data?.error || error.message);
      }
    }
  }

  async testClientWhatsApp() {
    console.log('📱 Testing Client-Specific WhatsApp...');
    
    for (const client of this.createdClients) {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/clients/${client.clientId}/whatsapp/qr-code`
        );
        
        this.logTest(`WhatsApp QR: ${client.organizationName}`, true, 
          'Client-specific QR code generated');
        
      } catch (error) {
        this.logTest(`WhatsApp QR: ${client.organizationName}`, false, 
          error.response?.data?.error || error.message);
      }
    }
  }

  async testAnalytics() {
    console.log('📊 Testing Analytics...');
    
    for (const client of this.createdClients) {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/clients/${client.clientId}/analytics/dashboard`
        );
        
        this.logTest(`Analytics: ${client.organizationName}`, true, 
          'Dashboard data retrieved');
        
      } catch (error) {
        this.logTest(`Analytics: ${client.organizationName}`, false, 
          error.response?.data?.error || error.message);
      }
    }
  }

  async testAdminOperations() {
    console.log('👨‍💼 Testing Admin Operations...');
    
    try {
      // List all clients
      const listResponse = await axios.get(`${BASE_URL}/api/admin/clients`);
      this.logTest('List Clients', true, 
        `Found ${listResponse.data.clients?.length || 0} clients`);
      
      // Update a client (if any exist)
      if (this.createdClients.length > 0) {
        const client = this.createdClients[0];
        const updateResponse = await axios.put(
          `${BASE_URL}/api/admin/clients/${client.clientId}`,
          {
            organizationName: client.organizationName + ' (Updated)',
            ...client
          }
        );
        
        this.logTest('Update Client', true, 'Client updated successfully');
      }
      
    } catch (error) {
      this.logTest('Admin Operations', false, 
        error.response?.data?.error || error.message);
    }
  }

  logTest(testName, passed, details) {
    const status = passed ? '✅' : '❌';
    const result = { testName, passed, details };
    this.testResults.push(result);
    console.log(`   ${status} ${testName}: ${details}`);
  }

  displayResults() {
    console.log('\n🧪 Test Results Summary:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.testName}: ${r.details}`));
    }
    
    console.log('\n🎯 Next Steps:');
    if (passed === total) {
      console.log('   ✅ All tests passed! Your multi-client architecture is working.');
      console.log('   🚀 Ready to proceed to Phase 2: Insurance Contamination Cleanup');
    } else {
      console.log('   🔧 Fix failing tests before proceeding to Phase 2');
      console.log('   📋 Check server logs for detailed error information');
    }
    
    if (this.createdClients.length > 0) {
      console.log('\n📝 Created Test Clients:');
      this.createdClients.forEach(client => {
        console.log(`   - ${client.organizationName} (${client.clientId})`);
      });
    }
  }
}

// Run the tests
async function main() {
  const tester = new MultiClientTester();
  await tester.runAllTests();
}

// If running directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MultiClientTester;