import { OpenAI } from 'openai';
import { AIContext, Event, Activity, AvailabilitySlot, User } from '@/types';

export class AIEventPlannerService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: process.env.NVIDIA_BASE_URL,
      apiKey: process.env.NVIDIA_API_KEY,
    });
  }

  async generateEventSuggestions(context: AIContext): Promise<string> {
    const systemPrompt = `You are an expert event planning AI assistant. Your role is to help coordinate events by analyzing schedules, preferences, and available activities. Be helpful, creative, and considerate of everyone's needs.

Context:
- Event: ${context.event.title}
- Participants: ${context.participants.length} people
- Available time slots: ${context.availability.length}
- Nearby activities: ${context.nearbyActivities.length}

Guidelines:
- Suggest optimal times based on participant availability
- Recommend activities that match the group's preferences
- Consider location, budget, and accessibility needs
- Provide alternative options
- Be conversational and engaging`;

    const userPrompt = this.buildContextPrompt(context);

    try {
      const completion = await this.client.chat.completions.create({
        model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 2048,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false
      });

      return completion.choices[0]?.message?.content || "I'd be happy to help plan your event! Could you provide more details about what you're looking for?";
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      throw new Error('Failed to generate event suggestions');
    }
  }

  async processUserMessage(
    message: string,
    context: AIContext
  ): Promise<string> {
    const systemPrompt = `You are an AI event planning assistant. The user is discussing an event they're planning. Help them by:

1. Understanding their needs and preferences
2. Suggesting optimal meeting times based on participant availability
3. Recommending activities and locations
4. Addressing concerns about the current plan
5. Helping coordinate with other participants

Current event context:
- Title: ${context.event.title}
- Description: ${context.event.description || 'No description provided'}
- Status: ${context.event.status}
- Participants: ${context.participants.map(p => p.name).join(', ')}
- Location: ${context.event.location?.address || 'Not specified'}

Be conversational, helpful, and provide actionable suggestions.`;

    const conversationHistory = context.chatHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const userPrompt = `Previous conversation:
${conversationHistory}

Current situation:
${this.buildContextPrompt(context)}

User message: ${message}

Please respond helpfully and suggest next steps for planning this event.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 1024,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false
      });

      return completion.choices[0]?.message?.content || "I'm here to help with your event planning! Could you tell me more about what you need?";
    } catch (error) {
      console.error('Error processing user message:', error);
      throw new Error('Failed to process message');
    }
  }

  async streamResponse(
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const systemPrompt = `You are an AI event planning assistant helping coordinate events and schedules.`;
    
    const userPrompt = `${this.buildContextPrompt(context)}\n\nUser: ${message}`;

    try {
      const stream = await this.client.chat.completions.create({
        model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 1024,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('Error streaming AI response:', error);
      throw new Error('Failed to stream response');
    }
  }

  async analyzeBestTimeSlots(
    availability: AvailabilitySlot[],
    preferences: any,
    participants: User[]
  ): Promise<{
    recommended: AvailabilitySlot[];
    reasoning: string;
  }> {
    const prompt = `Analyze these available time slots and recommend the best options:

Available slots:
${availability.map((slot, i) => 
  `${i + 1}. ${slot.start.toLocaleString()} - ${slot.end.toLocaleString()} (${slot.participants.length}/${participants.length} people available)`
).join('\n')}

Preferences:
- Time of day: ${preferences.timeOfDay}
- Activity types: ${preferences.activityTypes?.join(', ') || 'None specified'}

Please recommend the top 3 time slots and explain your reasoning.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        messages: [
          { role: "system", content: "You are an expert at analyzing schedules and making optimal recommendations." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 512,
        stream: false
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Sort slots by number of participants and time preferences
      const sortedSlots = availability
        .sort((a, b) => {
          // Prioritize slots with more participants
          if (b.participants.length !== a.participants.length) {
            return b.participants.length - a.participants.length;
          }
          
          // Then by time preferences
          const aHour = a.start.getHours();
          const bHour = b.start.getHours();
          
          if (preferences.timeOfDay === 'morning' && aHour < 12 && bHour >= 12) return -1;
          if (preferences.timeOfDay === 'afternoon' && aHour >= 12 && aHour < 17 && (bHour < 12 || bHour >= 17)) return -1;
          if (preferences.timeOfDay === 'evening' && aHour >= 17 && bHour < 17) return -1;
          
          return 0;
        })
        .slice(0, 3);

      return {
        recommended: sortedSlots,
        reasoning: response
      };
    } catch (error) {
      console.error('Error analyzing time slots:', error);
      
      // Fallback logic
      const topSlots = availability
        .sort((a, b) => b.participants.length - a.participants.length)
        .slice(0, 3);
        
      return {
        recommended: topSlots,
        reasoning: "Based on participant availability, these are the optimal time slots."
      };
    }
  }

  private buildContextPrompt(context: AIContext): string {
    const { event, participants, availability, nearbyActivities } = context;
    
    return `Event Planning Context:

Event Details:
- Title: ${event.title}
- Description: ${event.description || 'No description'}
- Duration: ${event.duration} minutes
- Status: ${event.status}
- Location: ${event.location?.address || 'Not specified'}

Participants (${participants.length}):
${participants.map(p => `- ${p.name} (${p.email})`).join('\n')}

Available Time Slots (${availability.length}):
${availability.slice(0, 5).map((slot, i) => 
  `${i + 1}. ${slot.start.toLocaleDateString()} ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()} (${slot.participants.length}/${participants.length} available)`
).join('\n')}
${availability.length > 5 ? `... and ${availability.length - 5} more slots` : ''}

Nearby Activities (${nearbyActivities.length}):
${nearbyActivities.slice(0, 5).map((activity, i) => 
  `${i + 1}. ${activity.name} - ${activity.type} (${activity.rating ? activity.rating + ' stars' : 'No rating'})`
).join('\n')}
${nearbyActivities.length > 5 ? `... and ${nearbyActivities.length - 5} more activities` : ''}

Preferences:
- Time of day: ${event.preferences.timeOfDay}
- Activity types: ${event.preferences.activityTypes.join(', ') || 'None specified'}
- Budget: ${event.preferences.budget ? `$${event.preferences.budget.min} - $${event.preferences.budget.max}` : 'Not specified'}`;
  }
} 