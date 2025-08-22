import React, { useState, useEffect } from 'react';
import { Building2, MessageCircle, BarChart3, Settings, Wifi, WifiOff, QrCode } from 'lucide-react';
import { multiClientAPI, systemAPI } from '../services/api';

// Types
interface Client {
  clientId: string;
  organizationName: string;
  domains: string[];
  status: string;
  billingTier: string;
  createdAt: string;
  lastActivity: string;
  usageToday: {
    messages: number;
    socialPosts: number;
    queries: number;
  };
  health: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  confidence?: number;
}

interface AgentStatus {
  original: { type: string; endpoint: string; status: string };
  generic: { type: string; endpoint: string; status: string };
  multiClient: {
    type: string;
    endpoints: string[];
    status: string;
    features: string[];
    clients: number;
  };
}

const MultiClientTestInterface: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');
  const [activeTab, setActiveTab] = useState<'chat' | 'clients' | 'analytics' | 'admin'>('clients');
  const [userId] = useState(() => `test_user_${Date.now()}`);

  // Test clients data for quick setup
  const testClients = [
    {
      organizationName: 'ABC Insurance Company',
      domains: ['insurance'],
      contactEmail: 'admin@abc-insurance.com',
      whatsapp: { businessPhoneNumber: '+1234567890' },
      industry: 'insurance'
    },
    {
      organizationName: 'BigBlue Resort & Spa',
      domains: ['resort'],
      contactEmail: 'admin@bigblue-resort.com',
      whatsapp: { businessPhoneNumber: '+1234567891' },
      industry: 'hospitality'
    },
    {
      organizationName: 'SSNIT Pension Services',
      domains: ['pension'],
      contactEmail: 'admin@ssnit-pension.com',
      whatsapp: { businessPhoneNumber: '+1234567892' },
      industry: 'finance'
    }
  ];

  // Initialize
  useEffect(() => {
    initializeInterface();
  }, []);

  const initializeInterface = async () => {
    try {
      setConnectionStatus('testing');
      
      // Test connection
      const status = await systemAPI.getAgentStatus();
      setAgentStatus(status);
      setConnectionStatus('connected');
      
      // Load existing clients
      await loadClients();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const loadClients = async () => {
    try {
      const response = await multiClientAPI.listClients();
      setClients(response.data?.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    }
  };

  const createTestClients = async () => {
    setIsLoading(true);
    try {
      for (const clientData of testClients) {
        await multiClientAPI.createClient(clientData);
      }
      await loadClients();
      alert('Test clients created successfully!');
    } catch (error) {
      console.error('Failed to create test clients:', error);
      alert('Failed to create test clients. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedDomain(client.domains[0] || '');
    setMessages([{
      id: '1',
      text: `Welcome to ${client.organizationName}! I'm your AI assistant specialized in ${client.domains.join(', ')}. How can I help you today?`,
      sender: 'ai',
      timestamp: new Date(),
      confidence: 1.0
    }]);
    setActiveTab('chat');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedClient || !selectedDomain || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await multiClientAPI.sendMessage(
        selectedClient.clientId, 
        selectedDomain, 
        userMessage.text, 
        userId
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date(),
        confidence: response.data.confidence
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsAppQR = async (client: Client) => {
    try {
      const result = await multiClientAPI.getWhatsAppQRHTML(client.clientId);
      window.open(result.htmlUrl, '_blank', 'width=500,height=600');
    } catch (error) {
      console.error('Failed to open WhatsApp QR:', error);
      alert('Failed to generate WhatsApp QR code');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px'
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '24px'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#1a202c',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '16px'
    },
    connectionStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px',
      backgroundColor: '#f7fafc',
      borderRadius: '8px',
      marginBottom: '24px',
      border: '1px solid #e2e8f0'
    },
    connectionStatusSuccess: {
      backgroundColor: '#f0fff4',
      borderColor: '#9ae6b4'
    },
    connectionStatusError: {
      backgroundColor: '#fed7d7',
      borderColor: '#fc8181'
    },
    tabs: {
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '24px'
    },
    tabsNav: {
      display: 'flex',
      gap: '32px'
    },
    tab: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '16px 4px',
      borderBottom: '2px solid transparent',
      fontWeight: '500',
      fontSize: '14px',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'transparent',
      border: 'none'
    },
    tabActive: {
      borderBottomColor: '#3b82f6',
      color: '#3b82f6'
    },
    content: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      padding: '24px'
    },
    clientsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    clientsTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a202c'
    },
    createButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    createButtonHover: {
      backgroundColor: '#2563eb'
    },
    createButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '48px',
      color: '#6b7280'
    },
    emptyIcon: {
      width: '48px',
      height: '48px',
      margin: '0 auto 16px',
      color: '#d1d5db'
    },
    clientGrid: {
      display: 'grid',
      gap: '16px'
    },
    clientCard: {
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      transition: 'box-shadow 0.2s',
      cursor: 'pointer'
    },
    clientCardHover: {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    },
    clientCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    },
    clientName: {
      fontWeight: '600',
      fontSize: '18px',
      color: '#1a202c'
    },
    clientActions: {
      display: 'flex',
      gap: '8px'
    },
    iconButton: {
      padding: '8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    qrButton: {
      color: '#059669',
      backgroundColor: 'transparent'
    },
    qrButtonHover: {
      backgroundColor: '#ecfdf5'
    },
    testChatButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '4px 12px',
      fontSize: '14px'
    },
    clientDetails: {
      fontSize: '14px',
      color: '#6b7280',
      lineHeight: '1.5'
    },
    clientDetailRow: {
      marginBottom: '4px'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '4px'
    },
    statusBadgeActive: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    statusBadgeInactive: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    chatContainer: {
      height: '400px',
      display: 'flex',
      flexDirection: 'column' as const,
      border: '1px solid #e2e8f0',
      borderRadius: '8px'
    },
    chatHeader: {
      padding: '16px',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f9fafb',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px'
    },
    chatHeaderTitle: {
      fontWeight: '600',
      color: '#1a202c'
    },
    chatHeaderSubtitle: {
      fontSize: '14px',
      color: '#6b7280'
    },
    chatMessages: {
      flex: 1,
      padding: '16px',
      overflowY: 'auto' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px'
    },
    messageRow: {
      display: 'flex'
    },
    messageRowUser: {
      justifyContent: 'flex-end'
    },
    messageRowAi: {
      justifyContent: 'flex-start'
    },
    messageBubble: {
      maxWidth: '75%',
      padding: '12px 16px',
      borderRadius: '8px'
    },
    messageBubbleUser: {
      backgroundColor: '#3b82f6',
      color: 'white',
      borderBottomRightRadius: '4px'
    },
    messageBubbleAi: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderBottomLeftRadius: '4px'
    },
    messageText: {
      fontSize: '14px',
      lineHeight: '1.4',
      margin: 0
    },
    messageTime: {
      fontSize: '12px',
      marginTop: '4px',
      opacity: 0.7
    },
    loadingDots: {
      display: 'flex',
      gap: '4px',
      padding: '12px 16px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
      borderBottomLeftRadius: '4px'
    },
    loadingDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#9ca3af',
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite ease-in-out'
    },
    chatInput: {
      padding: '16px',
      borderTop: '1px solid #e2e8f0'
    },
    inputGroup: {
      display: 'flex',
      gap: '8px'
    },
    textInput: {
      flex: 1,
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    textInputFocus: {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    },
    sendButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontWeight: '500',
      cursor: 'pointer'
    },
    sendButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    analyticsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    analyticCard: {
      padding: '16px',
      borderRadius: '8px'
    },
    analyticCardBlue: {
      backgroundColor: '#dbeafe'
    },
    analyticCardGreen: {
      backgroundColor: '#dcfce7'
    },
    analyticCardPurple: {
      backgroundColor: '#e9d5ff'
    },
    analyticTitle: {
      fontWeight: '600',
      marginBottom: '8px'
    },
    analyticValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '4px'
    },
    analyticLabel: {
      fontSize: '14px'
    },
    featuresContainer: {
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px'
    },
    featuresTitle: {
      fontWeight: '600',
      marginBottom: '8px'
    },
    featureTag: {
      display: 'inline-block',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '14px',
      marginRight: '8px',
      marginBottom: '8px'
    }
  };

  // Render Functions
  const renderConnectionStatus = () => (
    <div style={{
      ...styles.connectionStatus,
      ...(connectionStatus === 'connected' ? styles.connectionStatusSuccess : 
          connectionStatus === 'disconnected' ? styles.connectionStatusError : {})
    }}>
      {connectionStatus === 'connected' ? (
        <>
          <Wifi style={{ width: '20px', height: '20px', color: '#059669' }} />
          <span style={{ color: '#047857', fontWeight: '500' }}>Multi-Client System Connected</span>
          {agentStatus?.multiClient?.clients !== undefined && (
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              ({agentStatus.multiClient.clients} clients active)
            </span>
          )}
        </>
      ) : connectionStatus === 'disconnected' ? (
        <>
          <WifiOff style={{ width: '20px', height: '20px', color: '#dc2626' }} />
          <span style={{ color: '#dc2626', fontWeight: '500' }}>Connection Failed</span>
        </>
      ) : (
        <>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #3b82f6',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: '#3b82f6', fontWeight: '500' }}>Testing Connection...</span>
        </>
      )}
    </div>
  );

  const renderClientList = () => (
    <div>
      <div style={styles.clientsHeader}>
        <h3 style={styles.clientsTitle}>Clients ({clients.length})</h3>
        <button
          onClick={createTestClients}
          disabled={isLoading}
          style={{
            ...styles.createButton,
            ...(isLoading ? styles.createButtonDisabled : {})
          }}
          onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          {isLoading ? 'Creating...' : 'Create Test Clients'}
        </button>
      </div>

      {clients.length === 0 ? (
        <div style={styles.emptyState}>
          <Building2 style={styles.emptyIcon} />
          <p>No clients found. Create test clients to get started.</p>
        </div>
      ) : (
        <div style={styles.clientGrid}>
          {clients.map((client) => (
            <div
              key={client.clientId}
              style={styles.clientCard}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={styles.clientCardHeader}>
                <h4 style={styles.clientName}>{client.organizationName}</h4>
                <div style={styles.clientActions}>
                  <button
                    onClick={() => openWhatsAppQR(client)}
                    style={{...styles.iconButton, ...styles.qrButton}}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="WhatsApp QR Code"
                  >
                    <QrCode style={{ width: '16px', height: '16px' }} />
                  </button>
                  <button
                    onClick={() => selectClient(client)}
                    style={{...styles.iconButton, ...styles.testChatButton}}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Test Chat
                  </button>
                </div>
              </div>
              
              <div style={styles.clientDetails}>
                <div style={styles.clientDetailRow}>
                  <strong>ID:</strong> {client.clientId}
                </div>
                <div style={styles.clientDetailRow}>
                  <strong>Domains:</strong> {client.domains.join(', ')}
                </div>
                <div style={styles.clientDetailRow}>
                  <strong>Status:</strong>
                  <span style={{
                    ...styles.statusBadge,
                    ...(client.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive)
                  }}>
                    {client.status}
                  </span>
                </div>
                <div style={styles.clientDetailRow}>
                  <strong>Usage Today:</strong> {client.usageToday?.messages || 0} messages
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderChat = () => {
    if (!selectedClient) {
      return (
        <div style={styles.emptyState}>
          <MessageCircle style={styles.emptyIcon} />
          <p>Select a client to start testing the chat interface</p>
        </div>
      );
    }

    return (
      <div style={styles.chatContainer}>
        <div style={styles.chatHeader}>
          <h3 style={styles.chatHeaderTitle}>{selectedClient.organizationName}</h3>
          <p style={styles.chatHeaderSubtitle}>Domain: {selectedDomain} | User: {userId}</p>
        </div>

        <div style={styles.chatMessages}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageRow,
                ...(message.sender === 'user' ? styles.messageRowUser : styles.messageRowAi)
              }}
            >
              <div style={{
                ...styles.messageBubble,
                ...(message.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleAi)
              }}>
                <p style={styles.messageText}>{message.text}</p>
                <p style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString()}
                  {message.confidence !== undefined && ` (${Math.round(message.confidence * 100)}%)`}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={styles.messageRowAi}>
              <div style={styles.loadingDots}>
                <div style={{...styles.loadingDot, animationDelay: '0s'}}></div>
                <div style={{...styles.loadingDot, animationDelay: '0.2s'}}></div>
                <div style={{...styles.loadingDot, animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.chatInput}>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Ask about ${selectedDomain}...`}
              style={styles.textInput}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                ...styles.sendButton,
                ...((!inputMessage.trim() || isLoading) ? styles.sendButtonDisabled : {})
              }}
              onMouseOver={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div>
      <h3 style={{...styles.clientsTitle, marginBottom: '24px'}}>System Analytics</h3>
      
      {agentStatus?.multiClient ? (
        <div style={styles.analyticsGrid}>
          <div style={{...styles.analyticCard, ...styles.analyticCardBlue}}>
            <h4 style={{...styles.analyticTitle, color: '#1e40af'}}>Multi-Client System</h4>
            <p style={{...styles.analyticValue, color: '#1d4ed8'}}>{agentStatus.multiClient.clients || 0}</p>
            <p style={{...styles.analyticLabel, color: '#3730a3'}}>Active Clients</p>
          </div>
          
          <div style={{...styles.analyticCard, ...styles.analyticCardGreen}}>
            <h4 style={{...styles.analyticTitle, color: '#166534'}}>System Status</h4>
            <p style={{...styles.analyticValue, color: '#15803d'}}>{agentStatus.multiClient.status || 'Unknown'}</p>
            <p style={{...styles.analyticLabel, color: '#166534'}}>All Systems Operational</p>
          </div>
          
          <div style={{...styles.analyticCard, ...styles.analyticCardPurple}}>
            <h4 style={{...styles.analyticTitle, color: '#7c3aed'}}>Features</h4>
            <p style={{...styles.analyticValue, color: '#8b5cf6'}}>{agentStatus.multiClient.features?.length || 0}</p>
            <p style={{...styles.analyticLabel, color: '#7c3aed'}}>Active Features</p>
          </div>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p>Loading system analytics...</p>
        </div>
      )}

      <div style={styles.featuresContainer}>
        <h4 style={styles.featuresTitle}>Available Features</h4>
        {agentStatus?.multiClient?.features && agentStatus.multiClient.features.length > 0 ? (
          agentStatus.multiClient.features.map((feature) => (
            <span key={feature} style={styles.featureTag}>
              {feature.replace(/_/g, ' ')}
            </span>
          ))
        ) : (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No features loaded yet...</p>
        )}
      </div>
    </div>
  );

  const renderAdminPanel = () => (
    <div>
      <h3 style={{...styles.clientsTitle, marginBottom: '24px'}}>Admin Panel</h3>
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <div style={{border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px'}}>
          <h4 style={{...styles.featuresTitle, marginBottom: '16px'}}>Quick Actions</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <button
              onClick={loadClients}
              style={{...styles.createButton, width: '100%'}}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Refresh Clients
            </button>
            <button
              onClick={createTestClients}
              disabled={isLoading}
              style={{
                ...styles.createButton,
                width: '100%',
                backgroundColor: '#059669',
                ...(isLoading ? styles.createButtonDisabled : {})
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#047857')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#059669')}
            >
              Create Test Clients
            </button>
            <button
              onClick={initializeInterface}
              style={{
                ...styles.createButton,
                width: '100%',
                backgroundColor: '#7c3aed'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            >
              Reconnect System
            </button>
          </div>
        </div>

        <div style={{border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px'}}>
          <h4 style={{...styles.featuresTitle, marginBottom: '16px'}}>System Information</h4>
          {agentStatus?.multiClient ? (
            <div style={{fontSize: '14px', lineHeight: '1.6'}}>
              <p><strong>Multi-Client Status:</strong> {agentStatus.multiClient.status || 'Unknown'}</p>
              <p><strong>Total Clients:</strong> {agentStatus.multiClient.clients || 0}</p>
              <p><strong>Available Endpoints:</strong></p>
              <ul style={{marginLeft: '16px', fontSize: '12px', color: '#6b7280'}}>
                {agentStatus.multiClient.endpoints?.map((endpoint) => (
                  <li key={endpoint} style={{marginBottom: '2px'}}>{endpoint}</li>
                )) || <li>No endpoints available</li>}
              </ul>
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Loading system information...</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
      
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Multi-Client AI System Test Interface</h1>
            <p style={styles.subtitle}>Test and manage your multi-client AI architecture</p>
          </div>

          {/* Connection Status */}
          {renderConnectionStatus()}

          {/* Navigation Tabs */}
          <div style={styles.tabs}>
            <nav style={styles.tabsNav}>
              {[
                { id: 'clients', label: 'Clients', icon: Building2 },
                { id: 'chat', label: 'Chat Test', icon: MessageCircle },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'admin', label: 'Admin', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  style={{
                    ...styles.tab,
                    ...(activeTab === id ? styles.tabActive : {})
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== id) {
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.borderBottomColor = '#d1d5db';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== id) {
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.borderBottomColor = 'transparent';
                    }
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px' }} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div style={styles.content}>
            {activeTab === 'clients' && renderClientList()}
            {activeTab === 'chat' && renderChat()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'admin' && renderAdminPanel()}
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiClientTestInterface;