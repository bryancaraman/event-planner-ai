import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    console.log('Fetching event:', params.id);

    const event = await DatabaseService.getEvent(params.id);
    if (!event) {
      console.error('Event not found:', params.id);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If userEmail is provided, check if user is a participant
    if (userEmail) {
      const user = await DatabaseService.getUserByEmail(userEmail);
      if (user && !event.participants.includes(user.id)) {
        console.error('User not a participant');
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    console.log('Event found:', event.title);
    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { userEmail, ...updates } = body;

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

    // If userEmail is provided, check if user is the creator
    if (userEmail) {
      const user = await DatabaseService.getUserByEmail(userEmail);
      if (!user || event.creatorId !== user.id) {
        return NextResponse.json({ error: 'Only the event creator can delete this event' }, { status: 403 });
      }
    }

    await DatabaseService.deleteEvent(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
} 