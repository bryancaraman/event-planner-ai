import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shareLink: string }> }
) {
  try {
    const params = await context.params;
    console.log('Share link route - params:', params.shareLink);
    const event = await DatabaseService.getEventByShareLink(params.shareLink);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return public event info (no sensitive data)
    const publicEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      participants: event.participants,
      createdAt: event.createdAt,
    };

    return NextResponse.json({ event: publicEvent });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
} 