import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { userEmail, userName } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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

    // Add user to event participants
    await DatabaseService.addParticipantToEvent(params.id, user.id);

    // Add system message about new participant
    await DatabaseService.addChatMessage(params.id, {
      content: `${user.name} joined the event!`,
      type: 'system',
    });

    const updatedEvent = await DatabaseService.getEvent(params.id);
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error joining event:', error);
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 });
  }
} 