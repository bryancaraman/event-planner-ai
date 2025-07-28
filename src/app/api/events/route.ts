import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/firebase-admin';
import { DatabaseService } from '@/lib/database';

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await getUserFromToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, location, preferredDates, duration, preferences } = body;

    // Check if user exists in our database, create if not
    let dbUser = await DatabaseService.getUserByEmail(user.email);
    if (!dbUser) {
      const userId = await DatabaseService.createUser({
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
      dbUser = await DatabaseService.getUser(userId);
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const eventData = {
      title,
      description,
      creatorId: dbUser.id,
      participants: [dbUser.id],
      location,
      preferredDates: preferredDates.map((date: string) => new Date(date)),
      duration: duration || 120,
      preferences: preferences || {
        timeOfDay: 'flexible',
        activityTypes: [],
        accessibility: [],
        dietaryRestrictions: [],
      },
      activities: [],
      chatMessages: [],
      status: 'planning' as const,
    };

    const eventId = await DatabaseService.createEvent(eventData);
    const event = await DatabaseService.getEvent(eventId);

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await DatabaseService.getUserByEmail(user.email);
    if (!dbUser) {
      return NextResponse.json({ events: [] });
    }

    const events = await DatabaseService.getUserEvents(dbUser.id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
} 