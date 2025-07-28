export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  participants: string[]; // User IDs
  location?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  preferredDates: Date[];
  finalizedDate?: Date;
  duration: number; // in minutes
  preferences: EventPreferences;
  activities: Activity[];
  chatMessages: ChatMessage[];
  shareLink: string;
  status: 'planning' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface EventPreferences {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible';
  activityTypes: string[];
  budget?: {
    min: number;
    max: number;
  };
  accessibility: string[];
  dietaryRestrictions: string[];
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  duration: number;
  cost?: number;
  rating?: number;
  description?: string;
  placeId?: string; // Google Places ID
}

export interface ChatMessage {
  id: string;
  eventId: string;
  userId?: string; // undefined for AI messages
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  participants: string[]; // User IDs who are available
}

export interface AIContext {
  event: Event;
  participants: User[];
  availability: AvailabilitySlot[];
  nearbyActivities: Activity[];
  chatHistory: ChatMessage[];
} 