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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is a participant
    const dbUser = await DatabaseService.getUserByEmail(user.email);
    if (!dbUser || !event.participants.includes(dbUser.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const dbUser = await DatabaseService.getUserByEmail(user.email);
    if (!dbUser || !event.participants.includes(dbUser.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const updates = { ...body };

    // Handle date fields
    if (updates.preferredDates) {
      updates.preferredDates = updates.preferredDates.map((date: string) => new Date(date));
    }
    if (updates.finalizedDate) {
      updates.finalizedDate = new Date(updates.finalizedDate);
    }

    await DatabaseService.updateEvent(params.id, updates);
    const updatedEvent = await DatabaseService.getEvent(params.id);

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const dbUser = await DatabaseService.getUserByEmail(user.email);
    if (!dbUser || event.creatorId !== dbUser.id) {
      return NextResponse.json({ error: 'Only the event creator can delete this event' }, { status: 403 });
    }

    await DatabaseService.deleteEvent(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
} 