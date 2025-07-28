import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { shareLink: string } }
) {
  try {
    const event = await DatabaseService.getEventByShareLink(params.shareLink);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return basic event info for public viewing
    const publicEventInfo = {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      status: event.status,
      createdAt: event.createdAt,
      participantCount: event.participants.length,
    };

    return NextResponse.json({ event: publicEventInfo });
  } catch (error) {
    console.error('Error fetching event by share link:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
} 