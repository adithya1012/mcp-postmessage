/**
 * AI Copilot - Inverted Architecture Demo
 *
 * This demonstrates an MCP Client running in the INNER FRAME that
 * communicates with an MCP Server in its parent window. The client
 * can call tools provided by the parent to access user data.
 *
 * Architecture: Inner Frame MCP Client + Outer Frame MCP Server
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  InnerFrameTransport,
  PostMessageInnerControl,
} from "$sdk/transport/postmessage/index.js";
import { generateSessionId } from "$sdk/utils/helpers.js";
import OpenAI from "openai";

// ============================================================================
// CHAT UI MANAGEMENT
// ============================================================================

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system" | "error";
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
    this.messageContainer = document.getElementById(
      "chat-messages"
    ) as HTMLElement;
    this.inputElement = document.getElementById(
      "chat-input"
    ) as HTMLTextAreaElement;
    this.sendButton = document.getElementById(
      "send-button"
    ) as HTMLButtonElement;
    this.statusElement = document.getElementById(
      "connection-status"
    ) as HTMLElement;
    this.typingIndicator = document.getElementById(
      "typing-indicator"
    ) as HTMLElement;
    this.quickActions = document.getElementById("quick-actions") as HTMLElement;
    this.welcomeState = document.getElementById("welcome-state") as HTMLElement;
    this.connectionError = document.getElementById(
      "connection-error"
    ) as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.inputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.inputElement.addEventListener("input", () => {
      this.autoResize();
    });
  }

  private autoResize() {
    this.inputElement.style.height = "auto";
    this.inputElement.style.height =
      Math.min(this.inputElement.scrollHeight, 100) + "px";
  }

  showConnecting() {
    this.statusElement.textContent = "Connecting...";
    this.statusElement.style.background = "rgba(241, 196, 15, 0.8)";
    this.inputElement.disabled = true;
    this.sendButton.disabled = true;
    this.welcomeState.style.display = "block";
    this.connectionError.style.display = "none";
    this.quickActions.style.display = "none";
  }

  showConnected() {
    this.statusElement.textContent = "Connected";
    this.statusElement.style.background = "rgba(0, 184, 148, 0.8)";
    this.inputElement.disabled = false;
    this.sendButton.disabled = false;
    this.welcomeState.style.display = "none";
    this.connectionError.style.display = "none";
    this.quickActions.style.display = "flex";
  }

  showConnectedWithOpenAI() {
    this.statusElement.textContent = "Connected (OpenAI)";
    this.statusElement.style.background = "rgba(0, 184, 148, 0.8)";
    this.inputElement.disabled = false;
    this.sendButton.disabled = false;
    this.welcomeState.style.display = "none";
    this.connectionError.style.display = "none";
    this.quickActions.style.display = "flex";
  }

  showDisconnected() {
    this.statusElement.textContent = "Disconnected";
    this.statusElement.style.background = "rgba(225, 112, 85, 0.8)";
    this.inputElement.disabled = true;
    this.sendButton.disabled = true;
    this.welcomeState.style.display = "none";
    this.connectionError.style.display = "block";
    this.quickActions.style.display = "none";
  }

  addMessage(type: ChatMessage["type"], content: string): ChatMessage {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    return message;
  }

  private renderMessage(message: ChatMessage) {
    const messageEl = document.createElement("div");
    messageEl.className = `message ${message.type}`;
    messageEl.textContent = message.content;

    // Append to message container
    this.messageContainer.appendChild(messageEl);
  }

  showTyping() {
    this.typingIndicator.style.display = "block";
    this.scrollToBottom();
  }

  hideTyping() {
    this.typingIndicator.style.display = "none";
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
    this.inputElement.value = "";
    this.autoResize();
  }

  sendMessage() {
    const content = this.getCurrentInput().trim();
    if (content && !this.inputElement.disabled) {
      this.addMessage("user", content);
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
    (window as any).sendQuickMessage = (message: string) =>
      this.sendQuickMessage(message);
    (window as any).reconnect = () => this.initialize();
    (window as any).copilotApp = this;
  }

  async initialize() {
    console.log("[AI-COPILOT] Initializing...");
    this.ui.showConnecting();

    // Add a small delay to ensure parent is ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Initialize OpenAI client
      const apiKey = this.getOpenAIApiKey();
      if (apiKey) {
        console.log(
          "[AI-COPILOT] OpenAI API key found, initializing client..."
        );
        this.openai = new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true,
        });
        console.log("[AI-COPILOT] OpenAI client initialized");
      } else {
        console.log(
          "[AI-COPILOT] No OpenAI API key provided, falling back to rule-based responses"
        );
      }

      console.log("[AI-COPILOT] Creating window control...");
      // Create window control for communicating with parent
      const windowControl = new PostMessageInnerControl(["*"]); // In production, specify parent origin

      console.log("[AI-COPILOT] Creating transport...");
      // Create transport for inner frame
      this.transport = new InnerFrameTransport(windowControl, {
        requiresVisibleSetup: false,
        minProtocolVersion: "1.0",
        maxProtocolVersion: "1.0",
      });

      console.log("[AI-COPILOT] Preparing to connect...");
      // Prepare to connect
      await this.transport.prepareToConnect();

      console.log("[AI-COPILOT] Creating MCP client...");
      // Create MCP client
      this.client = new Client({
        name: "ai-copilot",
        version: "1.0.0",
      });

      console.log("[AI-COPILOT] Connecting client to transport...");
      // Connect client to transport
      await this.client.connect(this.transport);

      console.log("[AI-COPILOT] Discovering tools...");
      // Discover available tools
      await this.discoverTools();

      if (this.openai) {
        this.ui.showConnectedWithOpenAI();
        this.ui.addMessage(
          "system",
          "🎉 Connected to your dashboard with OpenAI! I can provide intelligent responses and access your data."
        );
      } else {
        this.ui.showConnected();
        this.ui.addMessage(
          "system",
          "🎉 Connected to your dashboard! I can now access your data to help answer questions. Configure OpenAI API key in settings for enhanced responses."
        );
      }

      console.log("[AI-COPILOT] Successfully connected to parent dashboard");
    } catch (error) {
      console.error("[AI-COPILOT] Failed to initialize:", error);

      // Show connected state anyway so user can still interact
      this.ui.showConnected();
      this.ui.addMessage(
        "system",
        "⚠️ Connected in limited mode. Some features may not be available. Try refreshing to reconnect fully."
      );
      this.ui.addMessage(
        "error",
        `Connection error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      // Clear the transport and client so we fall back to mock responses
      this.transport = null;
      this.client = null;
    }
  }

  private getOpenAIApiKey(): string | null {
    // Try to get API key from various sources

    // 1. From localStorage (user can set this in browser console)
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) return storedKey;

    // 2. From URL parameter (for demo purposes)
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get("openai_key");
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
      this.availableTools = response.tools.map((tool) => tool.name);
      console.log("[AI-COPILOT] Available tools:", this.availableTools);
    } catch (error) {
      console.error("[AI-COPILOT] Failed to discover tools:", error);
    }
  }

  sendQuickMessage(message: string) {
    this.ui.addMessage("user", message);
    this.handleUserMessage(message);
  }

  async handleUserMessage(message: string) {
    // Handle message even if client is not connected
    this.ui.showTyping();

    try {
      // Process message with available capabilities
      const response = await this.processUserMessage(message);
      this.ui.hideTyping();
      this.ui.addMessage("assistant", response);
    } catch (error) {
      this.ui.hideTyping();
      console.error("[AI-COPILOT] Error processing message:", error);
      this.ui.addMessage(
        "error",
        "❌ Sorry, I encountered an error while processing your request. Please try again."
      );
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
      throw new Error("OpenAI client not initialized");
    }

    try {
      // Get available tools information with their schemas
      const toolsInfo = await this.getToolsInformation();
      const availableTools = await this.getAvailableToolsForOpenAI();

      const systemPrompt = `You are an AI assistant embedded in a patient dashboard system. You help healthcare professionals manage patient data and medical records.

Available tools and their functions:
${toolsInfo}

Rules:
1. Use the appropriate tools when users request to update patient data, add medical records, or retrieve patient information
2. Be professional and medical-focused in your responses
3. Always confirm when data has been successfully updated
4. Format responses clearly with medical terminology
5. Include relevant medical context and warnings when appropriate

Analyze the user's request and determine if you need to call any tools to fulfill it.`;

      // Use function calling if tools are available
      if (availableTools.length > 0) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          functions: availableTools,
          function_call: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        });

        const choice = completion.choices[0];

        if (choice?.message?.function_call) {
          // Execute the function call
          const functionName = choice.message.function_call.name;
          const functionArgs = JSON.parse(
            choice.message.function_call.arguments || "{}"
          );

          console.log(
            `[AI-COPILOT] Calling tool: ${functionName} with args:`,
            functionArgs
          );
          const toolResult = await this.callTool(functionName, functionArgs);

          // Generate a natural language response based on the tool result
          const formatCompletion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are a medical AI assistant. Format the tool result into a clear, professional medical response with appropriate medical terminology and formatting.",
              },
              {
                role: "user",
                content: `The user requested: "${message}"\n\nTool executed: ${functionName}\nResult: ${toolResult}\n\nProvide a professional medical response:`,
              },
            ],
            temperature: 0.3,
            max_tokens: 800,
          });

          return formatCompletion.choices[0]?.message?.content || toolResult;
        } else {
          // No function call needed, return the AI response
          return (
            choice?.message?.content ||
            "I'm here to help with patient data management. What would you like me to do?"
          );
        }
      } else {
        // No tools available, provide basic response
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        return (
          completion.choices[0]?.message?.content ||
          "I'm here to help with patient data management. What would you like me to do?"
        );
      }
    } catch (error) {
      console.error("[AI-COPILOT] OpenAI error:", error);
      // Fallback to rule-based processing
      return await this.processWithRules(message);
    }
  }

  private async getToolsInformation(): Promise<string> {
    if (!this.client)
      return "No tools available - not connected to patient dashboard";

    try {
      const response = await this.client.listTools();
      return response.tools
        .map(
          (tool) =>
            `- ${tool.name}: ${tool.description || "No description available"}`
        )
        .join("\n");
    } catch (error) {
      console.error(error);
      return "Error getting tool information";
    }
  }

  private async getAvailableToolsForOpenAI(): Promise<any[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.listTools();

      return response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || `Execute ${tool.name} tool`,
        parameters: tool.inputSchema || {
          type: "object",
          properties: {},
          required: [],
        },
      }));
    } catch (error) {
      console.error("[AI-COPILOT] Error getting tools for OpenAI:", error);
      return [];
    }
  }

  private async processWithRules(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Dynamic intent detection based on available tools and keywords
    const toolCallResult = await this.detectIntentAndCallTool(lowerMessage);
    if (toolCallResult) {
      return toolCallResult;
    }

    // Default helpful response with available actions
    const availableToolsText = await this.getToolsInformation();

    return `I'm here to help you manage patient data and medical records! 

**Available Actions:**
${availableToolsText}

You can ask me to:
• Update patient vital signs (blood pressure, blood sugar)
• Add new medications or allergies
• Schedule appointments
• View patient information
• Add medical history entries

Try asking something like "Update blood pressure to 130/85" or "Add a new medication" or click the quick action buttons below!`;
  }

  private async detectIntentAndCallTool(
    message: string
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      // Get available tools to match against
      const response = await this.client.listTools();
      const tools = response.tools;

      // Intent detection based on keywords and available tools
      for (const tool of tools) {
        const toolName = tool.name.toLowerCase();

        // Blood pressure related
        if (
          toolName.includes("bloodpressure") &&
          (message.includes("blood pressure") ||
            message.includes("bp") ||
            message.includes("systolic") ||
            message.includes("diastolic"))
        ) {
          // Try to extract numbers from the message
          const bpMatch = message.match(/(\d{2,3})[\/\s]+(\d{2,3})/);
          if (bpMatch) {
            const systolic = parseInt(bpMatch[1]);
            const diastolic = parseInt(bpMatch[2]);
            return await this.callTool(tool.name, { systolic, diastolic });
          } else {
            return "Please specify blood pressure values (e.g., '120/80' or 'Update blood pressure to 130/85')";
          }
        }

        // Blood sugar related
        if (
          toolName.includes("bloodsugar") &&
          (message.includes("blood sugar") ||
            message.includes("glucose") ||
            message.includes("sugar level"))
        ) {
          const sugarMatch = message.match(/(\d{2,3})/);
          if (sugarMatch) {
            const value = parseInt(sugarMatch[1]);
            return await this.callTool(tool.name, { value });
          } else {
            return "Please specify a blood sugar value (e.g., 'Update blood sugar to 95')";
          }
        }

        // Patient context/information
        if (toolName.includes("context") || toolName.includes("info")) {
          if (
            message.includes("who") ||
            message.includes("patient info") ||
            message.includes("show me") ||
            message.includes("current patient")
          ) {
            return await this.callTool(tool.name);
          }
        }

        // Medication related
        if (
          toolName.includes("medication") &&
          (message.includes("medication") ||
            message.includes("medicine") ||
            message.includes("drug") ||
            message.includes("prescription"))
        ) {
          // Simple medication parsing - in real app, you'd want more sophisticated NLP
          if (
            message.includes("add") ||
            message.includes("new") ||
            message.includes("prescribe")
          ) {
            return "To add a medication, please specify: medication name, dosage, and frequency. For example: 'Add Lisinopril 10mg daily'";
          }
        }

        // Allergy related
        if (
          toolName.includes("allerg") &&
          (message.includes("allerg") || message.includes("reaction"))
        ) {
          if (message.includes("add") || message.includes("update")) {
            return "To update allergies, please specify the allergy name and severity (Mild/Moderate/Severe). For example: 'Add penicillin allergy, severe'";
          }
        }

        // Appointment related
        if (
          toolName.includes("appointment") &&
          (message.includes("appointment") ||
            message.includes("schedule") ||
            message.includes("visit"))
        ) {
          return "Please specify the appointment date. For example: 'Schedule next appointment for Feb 15, 2025'";
        }
      }

      return null; // No tool matched
    } catch (error) {
      console.error("[AI-COPILOT] Error in intent detection:", error);
      return null;
    }
  }

  private async callTool(toolName: string, args: any = {}): Promise<string> {
    if (!this.client) {
      // Provide mock responses when not connected to MCP
      return this.getMockToolResponse(toolName);
    }

    try {
      console.log(`[AI-COPILOT] Calling tool: ${toolName} with args:`, args);
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract text content from the result
      if (Array.isArray(result.content) && result.content.length > 0) {
        return result.content[0].text || "No response received";
      }

      return "Tool executed successfully but returned no content.";
    } catch (error) {
      console.error(`[AI-COPILOT] Tool call failed for ${toolName}:`, error);
      // Fall back to mock response
      return this.getMockToolResponse(toolName);
    }
  }

  private getMockToolResponse(toolName: string): string {
    const lowerToolName = toolName.toLowerCase();

    if (lowerToolName.includes("bloodpressure")) {
      return `🩺 **Blood Pressure Updated** (Mock Data)

**New Reading:** 120/80 mmHg

The blood pressure has been recorded and added to the patient's medical history. The dashboard has been updated to reflect this new measurement.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    if (lowerToolName.includes("bloodsugar")) {
      return `📊 **Blood Sugar Updated** (Mock Data)

**New Reading:** 95 mg/dL (Normal)

The blood sugar level has been recorded and added to the patient's medical history. The dashboard has been updated with this new measurement.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    if (lowerToolName.includes("context") || lowerToolName.includes("info")) {
      return `👤 **Current Patient Information** (Mock Data)

**Name:** John Peterson
**Patient ID:** PT-2024-001
**DOB:** March 15, 1985 (Age: 40)

**Vital Signs:**
- **Blood Pressure:** 120/80 mmHg
- **Blood Sugar:** 95 mg/dL

**Visit Information:**
- **Last Visit:** Jan 15, 2025
- **Total Visits:** 12
- **Next Appointment:** Feb 10, 2025

**Allergies:** Penicillin (Severe), Shellfish (Moderate)

**Current Medications:** Lisinopril 10mg daily, Metformin 500mg twice daily

*Note: This is mock data. Connect to the dashboard for real patient information.*`;
    }

    if (lowerToolName.includes("medication")) {
      return `💊 **Medication Added** (Mock Data)

**Medication:** Sample Medication
**Dosage:** As specified
**Frequency:** As prescribed

The medication has been added to the patient's prescription list and recorded in their medical history.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    if (lowerToolName.includes("allerg")) {
      return `🚨 **Allergies Updated** (Mock Data)

The patient's allergy information has been updated in the dashboard. Medical staff will be alerted to these allergies during treatment.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    if (lowerToolName.includes("appointment")) {
      return `📅 **Appointment Scheduled** (Mock Data)

The patient's next appointment has been successfully scheduled and updated in the dashboard.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    if (lowerToolName.includes("history")) {
      return `📝 **Medical History Entry Added** (Mock Data)

The entry has been added to the patient's medical history timeline and will be visible in the dashboard.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
    }

    return `Tool "${toolName}" executed in mock mode. Please ensure you're connected to the patient dashboard for full functionality.

*Note: This is mock data. Connect to the dashboard for real functionality.*`;
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
  const panel = document.getElementById("config-panel");
  const input = document.getElementById("api-key-input") as HTMLInputElement;
  if (panel && input) {
    // Load current API key if exists
    const currentKey = localStorage.getItem("openai_api_key");
    if (currentKey) {
      input.value = currentKey;
    }
    panel.style.display = "flex";
  }
};

window.hideConfig = () => {
  const panel = document.getElementById("config-panel");
  if (panel) {
    panel.style.display = "none";
  }
};

window.saveApiKey = () => {
  const input = document.getElementById("api-key-input") as HTMLInputElement;
  if (input) {
    const apiKey = input.value.trim();
    if (apiKey) {
      localStorage.setItem("openai_api_key", apiKey);
      console.log("[AI-COPILOT] API key saved to localStorage");

      // Reinitialize the copilot with new API key
      if (copilotApp) {
        console.log("[AI-COPILOT] Reconnecting with new API key...");
        copilotApp.disconnect().then(() => {
          setTimeout(() => {
            copilotApp.initialize();
          }, 1000);
        });
      }
    } else {
      localStorage.removeItem("openai_api_key");
      console.log("[AI-COPILOT] API key removed from localStorage");
    }
    window.hideConfig();
  }
};

// ============================================================================
// APPLICATION STARTUP
// ============================================================================

let copilotApp: CopilotApp;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[AI-COPILOT] Page loaded, creating application...");
  console.log("[AI-COPILOT] DOM elements check:", {
    chatMessages: !!document.getElementById("chat-messages"),
    chatInput: !!document.getElementById("chat-input"),
    sendButton: !!document.getElementById("send-button"),
    connectionStatus: !!document.getElementById("connection-status"),
  });

  // Add test message listener
  window.addEventListener("message", (event) => {
    console.log("[AI-COPILOT] Received message:", event.data);
    if (event.data?.type === "test") {
      console.log("[AI-COPILOT] Responding to test message");
      (event.source as Window)?.postMessage(
        {
          type: "test-response",
          message: "Hello from AI Copilot!",
        },
        "*"
      );
    }
  });

  // Send a signal to parent that we're loaded
  if (window.parent !== window) {
    console.log("[AI-COPILOT] Sending ready signal to parent");
    window.parent.postMessage(
      {
        type: "copilot-ready",
        message: "AI Copilot iframe is ready",
      },
      "*"
    );
  }

  try {
    copilotApp = new CopilotApp();
    await copilotApp.initialize();
    console.log("[AI-COPILOT] Application initialized successfully");
  } catch (error) {
    console.error("[AI-COPILOT] Failed to initialize application:", error);
    // Show error in the UI
    const messageContainer = document.getElementById("chat-messages");
    if (messageContainer) {
      messageContainer.innerHTML = `
        <div style="padding: 1rem; background: #ffe6e6; color: #e74c3c; border-radius: 0.5rem; margin: 1rem;">
          ❌ Failed to initialize: ${
            error instanceof Error ? error.message : "Unknown error"
          }
        </div>
      `;
    }
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (copilotApp) {
    copilotApp.disconnect();
  }
});

console.log("[AI-COPILOT] Client script loaded");
