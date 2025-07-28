import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { AIEventPlannerService } from '@/lib/ai-service';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { GoogleMapsService } from '@/lib/google-maps';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const user = await DatabaseService.getUserByEmail(session.user.email);
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

    // Get calendar data for availability analysis
    const userEvents: { [userId: string]: any[] } = {};
    const availability: any[] = [];

    for (const participant of validParticipants) {
      if (participant?.googleAccessToken) {
        try {
          const calendarService = new GoogleCalendarService(participant.googleAccessToken);
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30); // Next 30 days

          const events = await calendarService.getEvents(startDate, endDate);
          userEvents[participant.id] = events;
        } catch (error) {
          console.error(`Error fetching calendar for user ${participant.id}:`, error);
          userEvents[participant.id] = [];
        }
      }
    }

    // Find available time slots
    if (Object.keys(userEvents).length > 0) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // Next 2 weeks
      
      const availableSlots = GoogleCalendarService.findAvailableSlots(
        userEvents,
        startDate,
        endDate,
        event.duration
      );
      availability.push(...availableSlots);
    }

    // Get nearby activities if location is specified
    let nearbyActivities: any[] = [];
    if (event.location?.coordinates) {
      try {
        const mapsService = new GoogleMapsService();
        nearbyActivities = await mapsService.getSuggestedActivities(
          event.location.coordinates,
          event.preferences.activityTypes
        );
      } catch (error) {
        console.error('Error fetching nearby activities:', error);
      }
    }

    // Get chat history
    const chatHistory = await DatabaseService.getEventChatMessages(params.id);

    // Generate AI response
    const aiService = new AIEventPlannerService();
    const aiContext = {
      event,
      participants: validParticipants,
      availability,
      nearbyActivities,
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
      availability: availability.slice(0, 5), // Return top 5 slots
      activities: nearbyActivities.slice(0, 5), // Return top 5 activities
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const user = await DatabaseService.getUserByEmail(session.user.email);
    if (!user || !event.participants.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await DatabaseService.getEventChatMessages(params.id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
} 