import React, { useState, useEffect } from 'react';
import { Building2, MessagesSquare, Wifi, WifiOff } from 'lucide-react';

// Import your existing components
import ChatInterface from './components/ChatInterface';
import LeadForm from './components/LeadForm';

// Import the new multi-client test interface
import MultiClientTestInterface from './components/MultiClientTestInterface';

// Import updated API services
import { 
  leadsAPI, 
  chatAPI, 
  multiClientAPI, 
  systemAPI, 
  testAllEndpoints 
} from './services/api';

interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  source: string;
  score: number;
  nextSteps: string[];
}

interface SystemStatus {
  originalChat: { status: string; error: any };
  genericChat: { status: string; error: any };
  multiClient: { status: string; error: any };
  systemHealth: { status: string; error: any };
}

function App() {
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [capturedLead, setCapturedLead] = useState<Lead | null>(null);
  const [chatData, setChatData] = useState<any>(null);
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeInterface, setActiveInterface] = useState<'legacy' | 'multiClient'>('multiClient');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize and test all systems on component mount
  useEffect(() => {
    performSystemCheck();
  }, []);

  const performSystemCheck = async () => {
    setIsLoading(true);
    setApiTestResult('🔄 Testing all systems...');
    
    try {
      const results = await testAllEndpoints();
      setSystemStatus(results);
      
      const healthyCount = Object.values(results).filter((r: any) => r.status === 'healthy').length;
      const totalCount = Object.values(results).length;
      
      if (healthyCount === totalCount) {
        setApiTestResult('✅ All systems operational');
      } else {
        setApiTestResult(`⚠️ ${healthyCount}/${totalCount} systems healthy`);
      }
      
      // Auto-clear after 5 seconds
      setTimeout(() => setApiTestResult(''), 5000);
      
    } catch (error) {
      console.error('System check failed:', error);
      setApiTestResult('❌ System check failed - Check console');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy functions (preserved)
  const testAPIConnection = async () => {
    try {
      console.log('🔧 Testing legacy API connection...');
      setApiTestResult('🔄 Testing legacy API...');
      
      const healthResponse = await chatAPI.healthCheck();
      console.log('✅ Legacy health check response:', healthResponse);
      setApiTestResult('✅ Legacy API Connection: OK');
      
      setTimeout(() => setApiTestResult(''), 3000);
    } catch (error) {
      console.error('❌ Legacy API test failed:', error);
      setApiTestResult('❌ Legacy API Connection: Failed');
    }
  };

  const handleLeadCapture = (leadData: any) => {
    setChatData(leadData);
    setShowLeadForm(true);
  };

  const handleLeadSubmit = async (formData: any) => {
    try {
      const leadData = {
        ...formData,
        source: 'web_chat',
        userId: userId,
        interests: inferInterests(chatData?.lastMessage || ''),
        urgencyLevel: determineUrgency(chatData?.confidence || 0.5),
        metadata: {
          chatData,
          initialMessage: chatData?.lastMessage,
          aiResponse: chatData?.aiResponse
        }
      };

      const response = await leadsAPI.createLead(leadData);
      
      if (response.success) {
        setCapturedLead(response.data);
        setShowLeadForm(false);
      }
    } catch (error) {
      console.error('Failed to capture lead:', error);
      alert('Failed to capture lead. Please try again.');
    }
  };

  // Helper functions (preserved)
  const inferInterests = (message: string): string[] => {
    const interests: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('car') || lowerMessage.includes('auto')) {
      interests.push('auto_insurance');
    }
    if (lowerMessage.includes('health') || lowerMessage.includes('medical')) {
      interests.push('health_insurance');
    }
    if (lowerMessage.includes('life') || lowerMessage.includes('family')) {
      interests.push('life_insurance');
    }
    if (lowerMessage.includes('business') || lowerMessage.includes('company')) {
      interests.push('business_insurance');
    }
    if (lowerMessage.includes('home') || lowerMessage.includes('property')) {
      interests.push('property_insurance');
    }
    
    return interests.length > 0 ? interests : ['general_inquiry'];
  };

  const determineUrgency = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.5) return 'medium';
    return 'low';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#059669';
      case 'error': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'error': return '❌';
      default: return '⚠️';
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    headerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '16px'
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      margin: '4px 0 0 0'
    },
    headerControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    interfaceSwitcher: {
      display: 'flex',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '4px',
      gap: '4px'
    },
    switcherButton: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    switcherButtonActive: {
      backgroundColor: 'white',
      color: '#7c3aed',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    switcherButtonInactive: {
      backgroundColor: 'transparent',
      color: 'white'
    },
    testButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    statusGrid: {
      marginTop: '16px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    },
    statusCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '12px'
    },
    statusCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    statusCardTitle: {
      fontSize: '14px',
      fontWeight: '500',
      margin: 0
    },
    statusCardDescription: {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: '4px'
    },
    resultBanner: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px'
    },
    resultText: {
      fontSize: '14px',
      fontWeight: '500',
      margin: 0
    },
    mainContent: {
      flex: 1
    },
    legacyContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '32px 16px'
    },
    legacyHeader: {
      marginBottom: '24px'
    },
    legacyTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a202c',
      marginBottom: '8px'
    },
    legacySubtitle: {
      color: '#6b7280',
      fontSize: '16px'
    },
    legacyGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '32px'
    },
    legacyCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      padding: '24px'
    },
    legacyCardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: '16px'
    },
    sidebar: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px'
    },
    statusItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    statusLabel: {
      fontSize: '14px',
      color: '#6b7280'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    },
    statusBadgeGreen: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    statusBadgeBlue: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    apiTestButton: {
      width: '100%',
      marginTop: '16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    sessionInfo: {
      fontSize: '14px',
      lineHeight: '1.6'
    },
    sessionInfoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    sessionInfoLabel: {
      color: '#6b7280'
    },
    sessionInfoValue: {
      fontFamily: 'monospace',
      fontSize: '12px'
    },
    comparisonNote: {
      backgroundColor: '#fefce8',
      border: '1px solid #facc15',
      borderRadius: '8px',
      padding: '16px'
    },
    comparisonTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#a16207',
      marginBottom: '8px'
    },
    comparisonList: {
      fontSize: '12px',
      color: '#a16207',
      lineHeight: '1.5',
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    comparisonListItem: {
      marginBottom: '4px'
    },
    modal: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      width: '100%',
      maxWidth: '28rem'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px'
    },
    successMessage: {
      position: 'fixed' as const,
      bottom: '16px',
      right: '16px',
      backgroundColor: '#059669',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    },
    successTitle: {
      fontWeight: '600',
      marginBottom: '4px'
    },
    successId: {
      fontSize: '14px',
      marginBottom: '8px'
    },
    dismissButton: {
      marginTop: '8px',
      fontSize: '12px',
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white'
    },
    footer: {
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '24px 0'
    },
    footerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 16px',
      textAlign: 'center' as const
    },
    footerText: {
      fontSize: '14px',
      color: '#9ca3af',
      margin: 0
    },
    footerSubtext: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerTop}>
            <div>
              <h1 style={styles.headerTitle}>AI Agent Test Platform</h1>
              <p style={styles.headerSubtitle}>
                Compare Legacy vs Multi-Client Architecture
              </p>
            </div>
            
            <div style={styles.headerControls}>
              {/* Interface Switcher */}
              <div style={styles.interfaceSwitcher}>
                <button
                  onClick={() => setActiveInterface('legacy')}
                  style={{
                    ...styles.switcherButton,
                    ...(activeInterface === 'legacy' ? styles.switcherButtonActive : styles.switcherButtonInactive)
                  }}
                  onMouseOver={(e) => {
                    if (activeInterface !== 'legacy') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeInterface !== 'legacy') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <MessagesSquare style={{ width: '16px', height: '16px' }} />
                  Legacy Interface
                </button>
                <button
                  onClick={() => setActiveInterface('multiClient')}
                  style={{
                    ...styles.switcherButton,
                    ...(activeInterface === 'multiClient' ? styles.switcherButtonActive : styles.switcherButtonInactive)
                  }}
                  onMouseOver={(e) => {
                    if (activeInterface !== 'multiClient') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeInterface !== 'multiClient') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Building2 style={{ width: '16px', height: '16px' }} />
                  Multi-Client Interface
                </button>
              </div>

              {/* System Status */}
              <button
                onClick={performSystemCheck}
                disabled={isLoading}
                style={{
                  ...styles.testButton,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
              >
                {isLoading ? '🔄 Testing...' : '🔧 Test Systems'}
              </button>
            </div>
          </div>

          {/* System Status Display */}
          {systemStatus && (
            <div style={styles.statusGrid}>
              <div style={styles.statusCard}>
                <div style={styles.statusCardHeader}>
                  <span style={styles.statusCardTitle}>Legacy Chat</span>
                  <span style={{ color: getStatusColor(systemStatus.originalChat.status) }}>
                    {getStatusIcon(systemStatus.originalChat.status)}
                  </span>
                </div>
                <p style={styles.statusCardDescription}>Original Insurance AI</p>
              </div>
              
              <div style={styles.statusCard}>
                <div style={styles.statusCardHeader}>
                  <span style={styles.statusCardTitle}>Generic Chat</span>
                  <span style={{ color: getStatusColor(systemStatus.genericChat.status) }}>
                    {getStatusIcon(systemStatus.genericChat.status)}
                  </span>
                </div>
                <p style={styles.statusCardDescription}>Domain-Agnostic AI</p>
              </div>
              
              <div style={styles.statusCard}>
                <div style={styles.statusCardHeader}>
                  <span style={styles.statusCardTitle}>Multi-Client</span>
                  <span style={{ color: getStatusColor(systemStatus.multiClient.status) }}>
                    {getStatusIcon(systemStatus.multiClient.status)}
                  </span>
                </div>
                <p style={styles.statusCardDescription}>Isolated Client AI</p>
              </div>
              
              <div style={styles.statusCard}>
                <div style={styles.statusCardHeader}>
                  <span style={styles.statusCardTitle}>System Health</span>
                  <span style={{ color: getStatusColor(systemStatus.systemHealth.status) }}>
                    {getStatusIcon(systemStatus.systemHealth.status)}
                  </span>
                </div>
                <p style={styles.statusCardDescription}>Overall Platform</p>
              </div>
            </div>
          )}

          {/* API Test Result */}
          {apiTestResult && (
            <div style={styles.resultBanner}>
              <div style={{
                ...styles.resultText,
                color: apiTestResult.includes('✅') ? '#10b981' : 
                       apiTestResult.includes('❌') ? '#ef4444' : 
                       apiTestResult.includes('⚠️') ? '#f59e0b' : '#ffffff'
              }}>
                {apiTestResult}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {activeInterface === 'legacy' ? (
          // Legacy Interface
          <div style={styles.legacyContent}>
            <div style={styles.legacyHeader}>
              <h2 style={styles.legacyTitle}>Legacy Insurance AI Interface</h2>
              <p style={styles.legacySubtitle}>Original single-domain insurance assistant (preserved for comparison)</p>
            </div>

            <div style={styles.legacyGrid}>
              {/* Chat Interface */}
              <div>
                <div style={styles.legacyCard}>
                  <h3 style={styles.legacyCardTitle}>
                    Chat with Legacy AI Assistant
                  </h3>
                  <ChatInterface 
                    userId={userId} 
                    onLeadCapture={handleLeadCapture}
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div style={styles.sidebar}>
                {/* System Status */}
                <div style={styles.legacyCard}>
                  <h4 style={styles.legacyCardTitle}>
                    Legacy System Status
                  </h4>
                  <div>
                    <div style={styles.statusItem}>
                      <span style={styles.statusLabel}>AI Service</span>
                      <span style={{...styles.statusBadge, ...styles.statusBadgeGreen}}>
                        Online
                      </span>
                    </div>
                    <div style={styles.statusItem}>
                      <span style={styles.statusLabel}>RAG System</span>
                      <span style={{...styles.statusBadge, ...styles.statusBadgeGreen}}>
                        Ready
                      </span>
                    </div>
                    <div style={styles.statusItem}>
                      <span style={styles.statusLabel}>Knowledge Base</span>
                      <span style={{...styles.statusBadge, ...styles.statusBadgeBlue}}>
                        Insurance Only
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={testAPIConnection}
                    style={styles.apiTestButton}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Test Legacy API
                  </button>
                </div>

                {/* Current User */}
                <div style={styles.legacyCard}>
                  <h4 style={styles.legacyCardTitle}>
                    Session Info
                  </h4>
                  <div style={styles.sessionInfo}>
                    <div style={styles.sessionInfoRow}>
                      <span style={styles.sessionInfoLabel}>User ID:</span>
                      <span style={styles.sessionInfoValue}>{userId}</span>
                    </div>
                    <div style={styles.sessionInfoRow}>
                      <span style={styles.sessionInfoLabel}>Session:</span>
                      <span style={{ color: '#059669' }}>Active</span>
                    </div>
                    <div style={styles.sessionInfoRow}>
                      <span style={styles.sessionInfoLabel}>Domain:</span>
                      <span style={{ color: '#3b82f6' }}>Insurance</span>
                    </div>
                  </div>
                </div>

                {/* Comparison Note */}
                <div style={styles.comparisonNote}>
                  <h4 style={styles.comparisonTitle}>Legacy Limitations</h4>
                  <ul style={styles.comparisonList}>
                    <li style={styles.comparisonListItem}>• Single domain (insurance only)</li>
                    <li style={styles.comparisonListItem}>• No client isolation</li>
                    <li style={styles.comparisonListItem}>• Shared knowledge base</li>
                    <li style={styles.comparisonListItem}>• No customization per organization</li>
                    <li style={styles.comparisonListItem}>• Limited scalability</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Multi-Client Interface
          <MultiClientTestInterface />
        )}
      </main>

      {/* Lead Form Modal (preserved) */}
      {showLeadForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Capture Lead Information</h3>
            <LeadForm
              onSubmit={handleLeadSubmit}
              onCancel={() => setShowLeadForm(false)}
              initialData={chatData}
            />
          </div>
        </div>
      )}

      {/* Success Message (preserved) */}
      {capturedLead && (
        <div style={styles.successMessage}>
          <p style={styles.successTitle}>Lead Captured Successfully!</p>
          <p style={styles.successId}>ID: {capturedLead.id}</p>
          <button
            onClick={() => setCapturedLead(null)}
            style={styles.dismissButton}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'none'}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'underline'}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>
            Multi-Client AI Platform • Legacy vs Multi-Client Architecture Comparison
          </p>
          <p style={styles.footerSubtext}>
            Switch between interfaces to compare functionality and performance
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;