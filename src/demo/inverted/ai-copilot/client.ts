/**
 * AI Copilot - Inverted Architecture Demo
 * 
 * This demonstrates an MCP Client running in the INNER FRAME that
 * communicates with an MCP Server in its parent window. The client
 * can call tools provided by the parent to access user data.
 * 
 * Architecture: Inner Frame MCP Client + Outer Frame MCP Server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InnerFrameTransport, PostMessageInnerControl } from '$sdk/transport/postmessage/index.js';
import { generateSessionId } from '$sdk/utils/helpers.js';
import OpenAI from 'openai';

// ============================================================================
// CHAT UI MANAGEMENT
// ============================================================================

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

class ChatUI {
  private messages: ChatMessage[] = [];
  private messageContainer: HTMLElement;
  private inputElement: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private statusElement: HTMLElement;
  private typingIndicator: HTMLElement;
  private quickActions: HTMLElement;
  private welcomeState: HTMLElement;
  private connectionError: HTMLElement;

  constructor() {
    this.messageContainer = document.getElementById('chat-messages') as HTMLElement;
    this.inputElement = document.getElementById('chat-input') as HTMLTextAreaElement;
    this.sendButton = document.getElementById('send-button') as HTMLButtonElement;
    this.statusElement = document.getElementById('connection-status') as HTMLElement;
    this.typingIndicator = document.getElementById('typing-indicator') as HTMLElement;
    this.quickActions = document.getElementById('quick-actions') as HTMLElement;
    this.welcomeState = document.getElementById('welcome-state') as HTMLElement;
    this.connectionError = document.getElementById('connection-error') as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.inputElement.addEventListener('input', () => {
      this.autoResize();
    });
  }

  private autoResize() {
    this.inputElement.style.height = 'auto';
    this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 100) + 'px';
  }

  showConnecting() {
    this.statusElement.textContent = 'Connecting...';
    this.statusElement.style.background = 'rgba(241, 196, 15, 0.8)';
    this.inputElement.disabled = true;
    this.sendButton.disabled = true;
    this.welcomeState.style.display = 'block';
    this.connectionError.style.display = 'none';
    this.quickActions.style.display = 'none';
  }

  showConnected() {
    this.statusElement.textContent = 'Connected';
    this.statusElement.style.background = 'rgba(0, 184, 148, 0.8)';
    this.inputElement.disabled = false;
    this.sendButton.disabled = false;
    this.welcomeState.style.display = 'none';
    this.connectionError.style.display = 'none';
    this.quickActions.style.display = 'flex';
  }

  showConnectedWithOpenAI() {
    this.statusElement.textContent = 'Connected (OpenAI)';
    this.statusElement.style.background = 'rgba(0, 184, 148, 0.8)';
    this.inputElement.disabled = false;
    this.sendButton.disabled = false;
    this.welcomeState.style.display = 'none';
    this.connectionError.style.display = 'none';
    this.quickActions.style.display = 'flex';
  }

  showDisconnected() {
    this.statusElement.textContent = 'Disconnected';
    this.statusElement.style.background = 'rgba(225, 112, 85, 0.8)';
    this.inputElement.disabled = true;
    this.sendButton.disabled = true;
    this.welcomeState.style.display = 'none';
    this.connectionError.style.display = 'block';
    this.quickActions.style.display = 'none';
  }

  addMessage(type: ChatMessage['type'], content: string): ChatMessage {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    return message;
  }

  private renderMessage(message: ChatMessage) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type}`;
    messageEl.textContent = message.content;
    
    // Append to message container
    this.messageContainer.appendChild(messageEl);
  }

  showTyping() {
    this.typingIndicator.style.display = 'block';
    this.scrollToBottom();
  }

  hideTyping() {
    this.typingIndicator.style.display = 'none';
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }, 100);
  }

  getCurrentInput(): string {
    return this.inputElement.value;
  }

  clearInput() {
    this.inputElement.value = '';
    this.autoResize();
  }

  sendMessage() {
    const content = this.getCurrentInput().trim();
    if (content && !this.inputElement.disabled) {
      this.addMessage('user', content);
      this.clearInput();
      
      // Trigger the actual sending
      (window as any).copilotApp?.handleUserMessage(content);
    }
  }
}

// ============================================================================
// COPILOT APPLICATION
// ============================================================================

class CopilotApp {
  private client: Client | null = null;
  private transport: InnerFrameTransport | null = null;
  private openai: OpenAI | null = null;
  private ui: ChatUI;
  private availableTools: string[] = [];

  constructor() {
    this.ui = new ChatUI();
    
    // Make methods available globally for HTML onclick handlers
    (window as any).sendMessage = () => this.ui.sendMessage();
    (window as any).sendQuickMessage = (message: string) => this.sendQuickMessage(message);
    (window as any).reconnect = () => this.initialize();
    (window as any).copilotApp = this;
  }

  async initialize() {
    console.log('[AI-COPILOT] Initializing...');
    this.ui.showConnecting();

    // Add a small delay to ensure parent is ready
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Initialize OpenAI client
      const apiKey = this.getOpenAIApiKey();
      if (apiKey) {
        console.log('[AI-COPILOT] OpenAI API key found, initializing client...');
        this.openai = new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true
        });
        console.log('[AI-COPILOT] OpenAI client initialized');
      } else {
        console.log('[AI-COPILOT] No OpenAI API key provided, falling back to rule-based responses');
      }

      console.log('[AI-COPILOT] Creating window control...');
      // Create window control for communicating with parent
      const windowControl = new PostMessageInnerControl(['*']); // In production, specify parent origin
      
      console.log('[AI-COPILOT] Creating transport...');
      // Create transport for inner frame
      this.transport = new InnerFrameTransport(windowControl, {
        requiresVisibleSetup: false,
        minProtocolVersion: '1.0',
        maxProtocolVersion: '1.0'
      });
      
      console.log('[AI-COPILOT] Preparing to connect...');
      // Prepare to connect
      await this.transport.prepareToConnect();
      
      console.log('[AI-COPILOT] Creating MCP client...');
      // Create MCP client
      this.client = new Client({
        name: 'ai-copilot',
        version: '1.0.0'
      });

      console.log('[AI-COPILOT] Connecting client to transport...');
      // Connect client to transport
      await this.client.connect(this.transport);
      
      console.log('[AI-COPILOT] Discovering tools...');
      // Discover available tools
      await this.discoverTools();
      
      if (this.openai) {
        this.ui.showConnectedWithOpenAI();
        this.ui.addMessage('system', '🎉 Connected to your dashboard with OpenAI! I can provide intelligent responses and access your data.');
      } else {
        this.ui.showConnected();
        this.ui.addMessage('system', '🎉 Connected to your dashboard! I can now access your data to help answer questions. Configure OpenAI API key in settings for enhanced responses.');
      }
      
      console.log('[AI-COPILOT] Successfully connected to parent dashboard');
      
    } catch (error) {
      console.error('[AI-COPILOT] Failed to initialize:', error);
      
      // Show connected state anyway so user can still interact
      this.ui.showConnected();
      this.ui.addMessage('system', '⚠️ Connected in limited mode. Some features may not be available. Try refreshing to reconnect fully.');
      this.ui.addMessage('error', `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clear the transport and client so we fall back to mock responses
      this.transport = null;
      this.client = null;
    }
  }

  private getOpenAIApiKey(): string | null {
    // Try to get API key from various sources
    
    // 1. From localStorage (user can set this in browser console)
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) return storedKey;
    
    // 2. From URL parameter (for demo purposes)
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('openai_key');
    if (urlKey) return urlKey;
    
    // 3. From environment variable (if available in browser context)
    // Note: This would typically be set during build time
    const envKey = (globalThis as any).OPENAI_API_KEY;
    if (envKey) return envKey;
    
    return null;
  }

  private async discoverTools() {
    if (!this.client) return;
    
    try {
      const response = await this.client.listTools();
      this.availableTools = response.tools.map(tool => tool.name);
      console.log('[AI-COPILOT] Available tools:', this.availableTools);
    } catch (error) {
      console.error('[AI-COPILOT] Failed to discover tools:', error);
    }
  }

  sendQuickMessage(message: string) {
    this.ui.addMessage('user', message);
    this.handleUserMessage(message);
  }

  async handleUserMessage(message: string) {
    // Handle message even if client is not connected
    this.ui.showTyping();

    try {
      // Process message with available capabilities
      const response = await this.processUserMessage(message);
      this.ui.hideTyping();
      this.ui.addMessage('assistant', response);
      
    } catch (error) {
      this.ui.hideTyping();
      console.error('[AI-COPILOT] Error processing message:', error);
      this.ui.addMessage('error', '❌ Sorry, I encountered an error while processing your request. Please try again.');
    }
  }

  private async processUserMessage(message: string): Promise<string> {
    // If OpenAI is available, use it for intelligent responses
    if (this.openai) {
      return await this.processWithOpenAI(message);
    }
    
    // Fallback to simple rule-based processing
    return await this.processWithRules(message);
  }

  private async processWithOpenAI(message: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Get available tools information
      const toolsInfo = await this.getToolsInformation();
      
      const systemPrompt = `You are an AI assistant embedded in a user dashboard. You can help users by accessing information about their account, projects, and system status.

Available tools:
${toolsInfo}

Rules:
1. When a user asks for information that matches one of the available tools, call the appropriate tool
2. Be conversational and helpful
3. Format responses nicely with emojis and markdown
4. If you need to use a tool, explain what you're doing
5. Always be friendly and professional

Current user message: "${message}"

Analyze the message and determine if you should call any tools to answer it. If so, call the appropriate tool(s) and format the response nicely.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";
      
      // Check if the AI response suggests calling a tool
      const toolCall = this.extractToolCallFromResponse(aiResponse, message);
      if (toolCall) {
        const toolResult = await this.callTool(toolCall);
        
        // Get a formatted response from OpenAI using the tool result
        const formatCompletion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an AI assistant. Format the following tool result data into a friendly, conversational response with appropriate emojis and formatting. Make it easy to read and helpful." },
            { role: "user", content: `User asked: "${message}"\n\nTool result: ${toolResult}\n\nFormat this into a nice response:` }
          ],
          temperature: 0.7,
          max_tokens: 800
        });

        return formatCompletion.choices[0]?.message?.content || toolResult;
      }
      
      return aiResponse;
      
    } catch (error) {
      console.error('[AI-COPILOT] OpenAI error:', error);
      // Fallback to rule-based processing
      return await this.processWithRules(message);
    }
  }

  private async getToolsInformation(): Promise<string> {
    if (!this.client) return "No tools available";
    
    try {
      const response = await this.client.listTools();
      return response.tools.map(tool => 
        `- ${tool.name}: ${tool.description || 'No description available'}`
      ).join('\n');
    } catch (error) {
      return "Error getting tool information";
    }
  }

  private extractToolCallFromResponse(aiResponse: string, userMessage: string): string | null {
    const message = userMessage.toLowerCase();
    
    // Simple intent detection - in a real implementation, you might use function calling
    if (message.includes('who am i') || message.includes('my info') || message.includes('user info') || message.includes('profile')) {
      return 'getCurrentUser';
    }
    
    if (message.includes('project') || message.includes('my work')) {
      return 'getUserProjects';
    }
    
    if (message.includes('system') || message.includes('health') || message.includes('status')) {
      return 'getSystemHealth';
    }
    
    if (message.includes('team') || message.includes('stats') || message.includes('statistics')) {
      return 'getTeamStats';
    }
    
    return null;
  }

  private async processWithRules(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Intent detection based on keywords
    if (lowerMessage.includes('who am i') || lowerMessage.includes('my info') || lowerMessage.includes('user info')) {
      return await this.callTool('getCurrentUser');
    }
    
    if (lowerMessage.includes('project') || lowerMessage.includes('my work')) {
      return await this.callTool('getUserProjects');
    }
    
    if (lowerMessage.includes('system') || lowerMessage.includes('health') || lowerMessage.includes('status')) {
      return await this.callTool('getSystemHealth');
    }
    
    if (lowerMessage.includes('team') || lowerMessage.includes('stats') || lowerMessage.includes('statistics')) {
      return await this.callTool('getTeamStats');
    }
    
    // Default helpful response with available actions
    return `I'm here to help you with information from your dashboard! 

I can help you with:
• 👤 **User information** - Ask "Who am I?" to see your profile
• 📂 **Your projects** - Ask "What are my current projects?" 
• 🏥 **System health** - Ask "What is the system health?"
• 📊 **Team statistics** - Ask "Show me team statistics"

Try asking one of these questions, or click the quick action buttons below!`;
  }

  private async callTool(toolName: string): Promise<string> {
    if (!this.client) {
      // Provide mock responses when not connected to MCP
      return this.getMockToolResponse(toolName);
    }

    try {
      console.log(`[AI-COPILOT] Calling tool: ${toolName}`);
      const result = await this.client.callTool({
        name: toolName,
        arguments: {}
      });

      // Extract text content from the result
      if (Array.isArray(result.content) && result.content.length > 0) {
        return result.content[0].text || 'No response received';
      }
      
      return 'Tool executed successfully but returned no content.';
      
    } catch (error) {
      console.error(`[AI-COPILOT] Tool call failed for ${toolName}:`, error);
      // Fall back to mock response
      return this.getMockToolResponse(toolName);
    }
  }

  private getMockToolResponse(toolName: string): string {
    switch (toolName) {
      case 'getCurrentUser':
        return `👤 **Current User Information** (Mock Data)

**Name:** Demo User
**Email:** demo@example.com
**Role:** Administrator
**Department:** Engineering
**Last Login:** Today at 2:45 PM

**Permissions:** Read, Write, Admin

**Preferences:**
- Theme: Light
- Notifications: Enabled
- Language: English

*Note: This is mock data. Connect to the dashboard for real information.*`;

      case 'getUserProjects':
        return `📂 **Your Projects** (Mock Data)

• **Project Alpha** (active) - 75% complete, deadline: Next Friday
• **Project Beta** (on-hold) - 40% complete, deadline: Next month
• **Project Gamma** (active) - 90% complete, deadline: Tomorrow

*Note: This is mock data. Connect to the dashboard for real project information.*`;

      case 'getSystemHealth':
        return `🏥 **System Health Report** (Mock Data)

**Overall Health:** 89%

**Service Status:**
✅ **API Gateway**: healthy (99.9% uptime)
✅ **Database**: healthy (99.7% uptime)
⚠️ **File Storage**: warning (97.2% uptime)
✅ **Analytics**: healthy (99.5% uptime)

*Note: This is mock data. Connect to the dashboard for real system status.*`;

      case 'getTeamStats':
        return `📊 **Team Statistics** (Mock Data)

**👥 Team Size:** 156 members across all departments
**🚀 Active Projects:** 24 projects currently in progress
**✅ Completed This Month:** 8 projects delivered successfully

*Note: This is mock data. Connect to the dashboard for real team statistics.*`;

      default:
        return `Tool "${toolName}" is not available in mock mode. Please ensure you're connected to the dashboard for full functionality.`;
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.client = null;
    this.ui.showDisconnected();
  }
}

// ============================================================================
// GLOBAL FUNCTIONS FOR HTML EVENT HANDLERS
// ============================================================================

declare global {
  interface Window {
    sendMessage: () => void;
    sendQuickMessage: (message: string) => void;
    reconnect: () => void;
    copilotApp: CopilotApp;
    showConfig: () => void;
    hideConfig: () => void;
    saveApiKey: () => void;
  }
}

// Configuration panel functions
window.showConfig = () => {
  const panel = document.getElementById('config-panel');
  const input = document.getElementById('api-key-input') as HTMLInputElement;
  if (panel && input) {
    // Load current API key if exists
    const currentKey = localStorage.getItem('openai_api_key');
    if (currentKey) {
      input.value = currentKey;
    }
    panel.style.display = 'flex';
  }
};

window.hideConfig = () => {
  const panel = document.getElementById('config-panel');
  if (panel) {
    panel.style.display = 'none';
  }
};

window.saveApiKey = () => {
  const input = document.getElementById('api-key-input') as HTMLInputElement;
  if (input) {
    const apiKey = input.value.trim();
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      console.log('[AI-COPILOT] API key saved to localStorage');
      
      // Reinitialize the copilot with new API key
      if (copilotApp) {
        console.log('[AI-COPILOT] Reconnecting with new API key...');
        copilotApp.disconnect().then(() => {
          setTimeout(() => {
            copilotApp.initialize();
          }, 1000);
        });
      }
    } else {
      localStorage.removeItem('openai_api_key');
      console.log('[AI-COPILOT] API key removed from localStorage');
    }
    window.hideConfig();
  }
};

// ============================================================================
// APPLICATION STARTUP
// ============================================================================

let copilotApp: CopilotApp;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AI-COPILOT] Page loaded, creating application...');
  console.log('[AI-COPILOT] DOM elements check:', {
    chatMessages: !!document.getElementById('chat-messages'),
    chatInput: !!document.getElementById('chat-input'),
    sendButton: !!document.getElementById('send-button'),
    connectionStatus: !!document.getElementById('connection-status')
  });
  
  // Add test message listener
  window.addEventListener('message', (event) => {
    console.log('[AI-COPILOT] Received message:', event.data);
    if (event.data?.type === 'test') {
      console.log('[AI-COPILOT] Responding to test message');
      (event.source as Window)?.postMessage({
        type: 'test-response',
        message: 'Hello from AI Copilot!'
      }, '*');
    }
  });
  
  // Send a signal to parent that we're loaded
  if (window.parent !== window) {
    console.log('[AI-COPILOT] Sending ready signal to parent');
    window.parent.postMessage({
      type: 'copilot-ready',
      message: 'AI Copilot iframe is ready'
    }, '*');
  }
  
  try {
    copilotApp = new CopilotApp();
    await copilotApp.initialize();
    console.log('[AI-COPILOT] Application initialized successfully');
  } catch (error) {
    console.error('[AI-COPILOT] Failed to initialize application:', error);
    // Show error in the UI
    const messageContainer = document.getElementById('chat-messages');
    if (messageContainer) {
      messageContainer.innerHTML = `
        <div style="padding: 1rem; background: #ffe6e6; color: #e74c3c; border-radius: 0.5rem; margin: 1rem;">
          ❌ Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      `;
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (copilotApp) {
    copilotApp.disconnect();
  }
});

console.log('[AI-COPILOT] Client script loaded');
