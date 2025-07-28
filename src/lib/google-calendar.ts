import { google } from 'googleapis';
import { CalendarEvent, AvailabilitySlot } from '@/types';

export class GoogleCalendarService {
  private calendar;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async getEvents(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items?.map((event) => ({
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        start: {
          dateTime: event.start?.dateTime || event.start?.date!,
          timeZone: event.start?.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date!,
          timeZone: event.end?.timeZone || 'UTC',
        },
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.email!,
          responseStatus: attendee.responseStatus || 'needsAction',
        })),
      })) || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  async createEvent(
    title: string,
    start: Date,
    end: Date,
    attendees: string[],
    description?: string,
    location?: string
  ): Promise<string> {
    try {
      const event = {
        summary: title,
        description,
        location,
        start: {
          dateTime: start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'UTC',
        },
        attendees: attendees.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  static findAvailableSlots(
    userEvents: { [userId: string]: CalendarEvent[] },
    startDate: Date,
    endDate: Date,
    duration: number = 120 // default 2 hours in minutes
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const userIds = Object.keys(userEvents);
    
    // Generate time slots for each day
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Check availability from 9 AM to 9 PM
      for (let hour = 9; hour <= 21 - Math.floor(duration / 60); hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);
        
        // Check if all users are available during this slot
        const availableUsers = userIds.filter((userId) => {
          const events = userEvents[userId] || [];
          return !events.some((event) => {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            
            // Check for overlap
            return (
              (slotStart >= eventStart && slotStart < eventEnd) ||
              (slotEnd > eventStart && slotEnd <= eventEnd) ||
              (slotStart <= eventStart && slotEnd >= eventEnd)
            );
          });
        });
        
        if (availableUsers.length > 0) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            participants: availableUsers,
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots.sort((a, b) => b.participants.length - a.participants.length);
  }
} 