import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, userEmail, userName } = body;

    if (!title || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create user
    let user = await DatabaseService.getUserByEmail(userEmail);
    if (!user) {
      const userId = await DatabaseService.createUser({
        email: userEmail,
        name: userName || 'Anonymous',
      });
      user = await DatabaseService.getUser(userId);
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create event with only defined fields
    const eventData: any = {
      title,
      creatorId: user.id,
      participants: [user.id],
      shareLink: DatabaseService.generateShareLink(),
      status: 'planning',
      createdAt: new Date(),
      preferences: {
        activityTypes: [],
        budget: { min: 0, max: 1000 },
        duration: 120,
      },
    };

    // Only add fields that are defined
    if (description && description.trim()) {
      eventData.description = description.trim();
    }

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
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const user = await DatabaseService.getUserByEmail(userEmail);
    if (!user) {
      return NextResponse.json({ events: [] });
    }

    const events = await DatabaseService.getUserEvents(user.id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
} 