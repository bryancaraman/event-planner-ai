import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';

export async function POST(
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

    // Get or create user
    let user = await DatabaseService.getUserByEmail(session.user.email);
    if (!user) {
      const userId = await DatabaseService.createUser({
        email: session.user.email,
        name: session.user.name || 'Anonymous',
        picture: session.user.image,
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