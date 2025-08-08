# OpenAI Integration for MCP PostMessage Transport

This document describes the OpenAI integration added to the inverted architecture demo of the MCP PostMessage transport.

## What Was Added

The inverted architecture AI copilot (`src/demo/inverted/ai-copilot/`) has been enhanced with OpenAI integration to provide intelligent responses instead of simple rule-based responses.

### Key Changes

1. **OpenAI Client Integration** (`client.ts`)

   - Added OpenAI import and client initialization
   - Enhanced `processUserMessage` to use OpenAI GPT-3.5-turbo for intelligent responses
   - Fallback to rule-based responses when OpenAI is not available
   - Tool calling integration with OpenAI for accessing user dashboard data

2. **Configuration UI** (`index.html`)

   - Added settings button in the header for OpenAI configuration
   - Configuration panel for entering OpenAI API key
   - Visual indicators for OpenAI status in connection status

3. **API Key Management**
   - API key stored securely in browser's localStorage
   - Multiple ways to provide API key:
     - Settings panel in the UI
     - URL parameter: `?openai_key=your_key_here`
     - Environment variable (if set during build)

## How It Works

### Without OpenAI API Key

- The copilot uses simple rule-based keyword matching
- Limited to predefined responses for specific queries
- Shows "Connected" status

### With OpenAI API Key

- The copilot uses GPT-3.5-turbo for intelligent conversation
- Can understand natural language queries and call appropriate MCP tools
- Formats responses in a friendly, conversational manner
- Shows "Connected (OpenAI)" status

### Tool Integration

The AI copilot can intelligently use the following MCP tools provided by the parent dashboard:

- `getCurrentUser` - Get user profile information
- `getUserProjects` - Get user's current projects
- `getSystemHealth` - Get system health status
- `getTeamStats` - Get team statistics

## Usage

1. **Start the development server:**

   ```bash
   bun run dev
   ```

2. **Open the inverted demo:**
   Navigate to `http://localhost:3000/inverted`

3. **Configure OpenAI (optional):**

   - Click the settings (⚙️) button in the AI copilot header
   - Enter your OpenAI API key
   - Click Save

4. **Test the integration:**
   - Try asking natural language questions like:
     - "Who am I?"
     - "What projects am I working on?"
     - "How is the system doing?"
     - "Tell me about our team"

## Security Notes

- API keys are stored locally in the browser's localStorage
- API keys are never sent to the demo server
- The OpenAI client uses `dangerouslyAllowBrowser: true` for demo purposes
- In production, consider using a backend proxy for OpenAI calls

## Dependencies Added

- `openai`: Official OpenAI API client library

## Architecture

The inverted architecture maintains the same MCP protocol structure:

- **Outer Frame**: MCP Server (User Dashboard)
- **Inner Frame**: MCP Client (AI Copilot with OpenAI)

The AI copilot runs as an MCP client in an iframe and can call tools provided by the parent dashboard through the postMessage transport.
