import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { AIEventPlannerService } from '@/lib/ai-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { message, userEmail } = body;

    if (!message || !userEmail) {
      return NextResponse.json({ error: 'Message and user email required' }, { status: 400 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const user = await DatabaseService.getUserByEmail(userEmail);
    if (!user || !event.participants.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Add user message to chat
    await DatabaseService.addChatMessage(params.id, {
      userId: user.id,
      content: message,
      type: 'user',
    });

    // Get all participants
    const participants = await Promise.all(
      event.participants.map(id => DatabaseService.getUser(id))
    );
    const validParticipants = participants.filter(p => p !== null);

    // Get chat history
    const chatHistory = await DatabaseService.getEventChatMessages(params.id);

    // Generate AI response
    const aiService = new AIEventPlannerService();
    const aiContext = {
      event,
      participants: validParticipants,
      availability: [], // Simplified - no calendar integration for now
      nearbyActivities: [], // Simplified - no maps integration for now
      chatHistory,
    };

    const aiResponse = await aiService.processUserMessage(message, aiContext);

    // Add AI response to chat
    await DatabaseService.addChatMessage(params.id, {
      content: aiResponse,
      type: 'ai',
    });

    return NextResponse.json({ 
      response: aiResponse,
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If userEmail is provided, check if user is a participant
    if (userEmail) {
      const user = await DatabaseService.getUserByEmail(userEmail);
      if (!user || !event.participants.includes(user.id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const messages = await DatabaseService.getEventChatMessages(params.id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
} 