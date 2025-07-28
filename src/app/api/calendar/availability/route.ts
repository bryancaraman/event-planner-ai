import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, startDate, endDate, duration } = body;

    const event = await DatabaseService.getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const user = await DatabaseService.getUserByEmail(session.user.email);
    if (!user || !event.participants.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all participants with calendar access
    const participants = await Promise.all(
      event.participants.map(id => DatabaseService.getUser(id))
    );
    const validParticipants = participants.filter(p => p !== null && p.googleAccessToken);

    const userEvents: { [userId: string]: any[] } = {};

    // Fetch calendar events for each participant
    for (const participant of validParticipants) {
      try {
        const calendarService = new GoogleCalendarService(participant.googleAccessToken!);
        const events = await calendarService.getEvents(
          new Date(startDate),
          new Date(endDate)
        );
        userEvents[participant.id] = events;
      } catch (error) {
        console.error(`Error fetching calendar for user ${participant.id}:`, error);
        userEvents[participant.id] = [];
      }
    }

    // Find available time slots
    const availableSlots = GoogleCalendarService.findAvailableSlots(
      userEvents,
      new Date(startDate),
      new Date(endDate),
      duration || event.duration
    );

    return NextResponse.json({ 
      availability: availableSlots,
      participantsWithCalendar: validParticipants.length,
      totalParticipants: event.participants.length,
    });
  } catch (error) {
    console.error('Error analyzing availability:', error);
    return NextResponse.json({ error: 'Failed to analyze availability' }, { status: 500 });
  }
} 