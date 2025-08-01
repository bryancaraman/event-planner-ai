import { Event, EventPreferences, ChatMessage, AIContext } from '@/types';

export class AIEventPlannerService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || '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';
    this.baseUrl = 'https://integrate.api.nvidia.com/v1';
  }

  async processUserMessage(message: string, context: AIContext): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...context.chatHistory.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
          messages,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I had trouble processing your message. Could you please try again?';
    } catch (error) {
      console.error('Error processing AI message:', error);
      return 'I encountered an error while processing your message. Please try again or ask me something else about your event planning!';
    }
  }

  private buildSystemPrompt(context: AIContext): string {
    const { event, participants } = context;
    
    return `You are a helpful event planning assistant. Give direct, practical responses. DO NOT show your thinking process, reasoning, or any internal thoughts.

IMPORTANT: You do NOT have access to real-time Google Maps, calendar data, or live information. Base suggestions on general knowledge.

Event: "${event.title}"
Participants: ${participants.length} people
Created: ${new Date(event.createdAt).toLocaleDateString()}

Your responses should:
- Be direct and actionable (1-2 sentences max)
- Give specific suggestions when possible
- Ask clarifying questions if you need more info
- Never explain your reasoning or show thinking
- Never mention accessing live data or APIs

Examples of good responses:
- "What city are you planning this in? I can suggest some popular venues."
- "For a group of 5, consider dinner at a restaurant followed by mini golf or bowling."
- "Weekend afternoons usually work well for group activities. What dates work for everyone?"

Examples of BAD responses:
- "Let me think about this..." 
- "I'm analyzing the available options..."
- "Based on my search of local venues..."
- Any explanation of your process`;
  }

  async generateEventSuggestions(event: Event, participants: any[]): Promise<string[]> {
    try {
      const prompt = `Based on this event: "${event.title}" with ${participants.length} participants, suggest 5 specific activity ideas. Be brief and practical.`;
      
      const response = await this.processUserMessage(prompt, {
        event,
        participants,
        availability: [],
        nearbyActivities: [],
        chatHistory: []
      });

      // Extract suggestions from response
      return response.split('\n').filter(line => line.trim()).slice(0, 5);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return ['Plan group activities', 'Find a venue', 'Coordinate schedules', 'Organize food/drinks', 'Set up entertainment'];
    }
  }

  async analyzeBestTimeSlots(availabilitySlots: any[], preferences: EventPreferences): Promise<any[]> {
    // Simplified implementation for now
    return availabilitySlots.slice(0, 3);
  }

  async streamResponse(message: string, context: AIContext): Promise<AsyncIterable<string>> {
    // For now, return the regular response as a single chunk
    const response = await this.processUserMessage(message, context);
    
    async function* generateResponse() {
      yield response;
    }
    
    return generateResponse();
  }
} 