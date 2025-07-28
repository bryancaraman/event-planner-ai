import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { AIEventPlannerService } from '@/lib/ai-service';
import { GoogleMapsService } from '@/lib/google-maps';

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

    // Get nearby activities if location is mentioned in the message or event
    let nearbyActivities: any[] = [];
    const hasLocationMention = message.toLowerCase().includes('location') || 
                              message.toLowerCase().includes('where') ||
                              message.toLowerCase().includes('venue') ||
                              message.toLowerCase().includes('place') ||
                              /\b[A-Z][a-z]+ (?:City|Street|Avenue|Road|Boulevard)\b/.test(message) ||
                              /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(message); // City, State pattern

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (hasLocationMention || event.location?.coordinates)) {
      try {
        const mapsService = new GoogleMapsService();
        
        // If user mentions a location in their message, try to geocode it
        if (hasLocationMention && !event.location?.coordinates) {
          const locationMatches = message.match(/(?:in|at|near)\s+([A-Z][a-z\s,]+)/i);
          if (locationMatches) {
            const locationQuery = locationMatches[1].trim();
            try {
              const geocodeResult = await mapsService.geocodeAddress(locationQuery);
              if (geocodeResult) {
                // Get activities near the mentioned location
                nearbyActivities = await mapsService.getSuggestedActivities(
                  geocodeResult,
                  event.preferences?.activityTypes || ['restaurant', 'tourist_attraction', 'amusement_park']
                );
              }
            } catch (geocodeError) {
              console.log('Could not geocode location from message:', locationQuery);
            }
          }
        }
        
        // Use existing event location if available
        if (event.location?.coordinates && nearbyActivities.length === 0) {
          nearbyActivities = await mapsService.getSuggestedActivities(
            event.location.coordinates,
            event.preferences?.activityTypes || ['restaurant', 'tourist_attraction', 'amusement_park']
          );
        }
      } catch (error) {
        console.error('Error fetching nearby activities:', error);
        nearbyActivities = [];
      }
    }

    // Get chat history
    const chatHistory = await DatabaseService.getEventChatMessages(params.id);

    // Generate AI response with real location data when available
    const aiService = new AIEventPlannerService();
    const aiContext = {
      event,
      participants: validParticipants,
      availability: [], // Calendar integration could be added here
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
      nearbyActivities: nearbyActivities.slice(0, 5), // Return top 5 activities for reference
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