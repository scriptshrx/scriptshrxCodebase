/**
 * Voice AI Platform Configuration
 * Centralized settings for OpenAI, Twilio, and Voice behaviors.
 * * NOTE: Values in 'system' serve as global fallbacks. 
 * Organization-specific settings should be fetched from the database 
 * and injected into the session at runtime.
 */

module.exports = {
   openai: {
      url: 'wss://api.openai.com/v1/realtime',
      model: 'gpt-4o-realtime-preview-2024-12-17', // Latest stable realtime model
      voice: 'alloy', // Fallback voice: alloy, echo, shimmer, ash, ballad, sage
      temperature: 0.8,
      modalities: ["text", "audio"],
      maxRetries: 5,
      initialRetryDelay: 1000,
   },
   twilio: {
      timeout: 15,
      mediaFormat: 'g711_ulaw',
      sampleRate: 8000,
   },
   system: {
      // These are WHITE-LABEL defaults. 
      // No brand names (like ScriptishRx) should be here.
      initialGreeting: "Hello! I am your AI assistant. How can I help you today?",
      defaultInstructions: `CONTEXT & BEHAVIOR (HYBRID MODE):
1. **Broadly Helpful**: You are an intelligent, versatile assistant. You answer general knowledge questions, engage in open dialogue, and help with topics beyond just appointments (e.g., general advice, definitions, chit-chat) to build rapport.
2. **Business Expert**: You represent the organization. You are knowledgeable about its specific services and value.
3. **Execution Focused**: While being conversational, always be ready to facilitate real outcomes (checking availability, booking appointments) using your tools.
4. **Transitioning**: If a user asks a general question that relates to our services, answer helpful then gently pivot to how we can help.`,

      // Behavior settings
      bargeInEnabled: true,      // Allows user to interrupt the AI
      silenceTimeout: 10000,     // 10 seconds of silence before hangup
      inputThreshold: 0.5,       // Voice activity detection sensitivity
      prefixPaddingMs: 300,
   },
   // Map these keys to your Database Columns for easy lookup
   tenantMapping: {
      dbTable: 'organizations',
      columns: {
         prompt: 'custom_system_prompt',
         greeting: 'custom_initial_greeting',
         twilioNumber: 'assigned_twilio_number'
      }
   }
};