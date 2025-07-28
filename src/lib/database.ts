import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  getFirestore
} from 'firebase/firestore';
import { db } from './firebase';
import { Event, User, ChatMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseService {
  // User operations
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const userWithTimestamps = {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'users'), userWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to get user by email');
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Event operations
  static async createEvent(eventData: any): Promise<string> {
    try {
      const db = getFirestore();
      const eventsCollection = collection(db, 'events');

      // Create the base event document with required fields
      const eventDoc: any = {
        title: eventData.title,
        creatorId: eventData.creatorId,
        participants: eventData.participants,
        createdAt: Timestamp.fromDate(eventData.createdAt || new Date()),
        shareLink: uuidv4(),
        status: eventData.status || 'planning',
        preferences: eventData.preferences || {
          activityTypes: [],
          budget: { min: 0, max: 1000 },
          duration: 120,
        },
        activities: eventData.activities || [],
        chatMessages: eventData.chatMessages || [],
      };

      // Add optional fields only if they exist and are defined
      if (eventData.description && eventData.description.trim()) {
        eventDoc.description = eventData.description;
      }

      if (eventData.preferredDates && Array.isArray(eventData.preferredDates)) {
        eventDoc.preferredDates = eventData.preferredDates.map((date: any) => Timestamp.fromDate(date));
      }

      if (eventData.duration && typeof eventData.duration === 'number') {
        eventDoc.duration = eventData.duration;
      }

      if (eventData.location) {
        eventDoc.location = eventData.location;
      }

      if (eventData.finalizedDate) {
        eventDoc.finalizedDate = Timestamp.fromDate(eventData.finalizedDate);
      }

      const docRef = await addDoc(eventsCollection, eventDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  static async getEvent(eventId: string): Promise<Event | null> {
    try {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Create base event object with required fields
        const event: any = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };

        // Safely handle optional timestamp fields
        if (data.updatedAt) {
          event.updatedAt = data.updatedAt.toDate();
        }

        if (data.preferredDates && Array.isArray(data.preferredDates)) {
          event.preferredDates = data.preferredDates.map((ts: Timestamp) => ts.toDate());
        }

        if (data.finalizedDate) {
          event.finalizedDate = data.finalizedDate.toDate();
        }

        return event as Event;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting event:', error);
      throw new Error('Failed to get event');
    }
  }

  static async getEventByShareLink(shareLink: string): Promise<Event | null> {
    try {
      const q = query(collection(db, 'events'), where('shareLink', '==', shareLink), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          preferredDates: data.preferredDates.map((ts: Timestamp) => ts.toDate()),
          finalizedDate: data.finalizedDate ? data.finalizedDate.toDate() : undefined,
        } as Event;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting event by share link:', error);
      throw new Error('Failed to get event by share link');
    }
  }

  static async getUserEvents(userId: string): Promise<Event[]> {
    try {
      // Simple query without ordering to avoid index requirement
      const q = query(
        collection(db, 'events'),
        where('participants', 'array-contains', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          preferredDates: data.preferredDates.map((ts: Timestamp) => ts.toDate()),
          finalizedDate: data.finalizedDate ? data.finalizedDate.toDate() : undefined,
        } as Event;
      });

      // Sort on the client side instead of in the query
      return events.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error getting user events:', error);
      throw new Error('Failed to get user events');
    }
  }

  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    try {
      const docRef = doc(db, 'events', eventId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Handle date fields
      if (updates.preferredDates) {
        updateData.preferredDates = updates.preferredDates.map(date => Timestamp.fromDate(date));
      }
      if (updates.finalizedDate) {
        updateData.finalizedDate = Timestamp.fromDate(updates.finalizedDate);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  static async addParticipantToEvent(eventId: string, userId: string): Promise<void> {
    try {
      const event = await this.getEvent(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.participants.includes(userId)) {
        const updatedParticipants = [...event.participants, userId];
        await this.updateEvent(eventId, { participants: updatedParticipants });
      }
    } catch (error) {
      console.error('Error adding participant to event:', error);
      throw new Error('Failed to add participant to event');
    }
  }

  static async removeParticipantFromEvent(eventId: string, userId: string): Promise<void> {
    try {
      const event = await this.getEvent(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const updatedParticipants = event.participants.filter(id => id !== userId);
      await this.updateEvent(eventId, { participants: updatedParticipants });
    } catch (error) {
      console.error('Error removing participant from event:', error);
      throw new Error('Failed to remove participant from event');
    }
  }

  // Chat message operations
  static async addChatMessage(
    eventId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<string> {
    try {
      const messageWithTimestamp = {
        ...message,
        eventId,
        timestamp: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'chatMessages'), messageWithTimestamp);
      
      // Also update the event's chatMessages array
      const event = await this.getEvent(eventId);
      if (event) {
        const updatedMessages = [...event.chatMessages, {
          id: docRef.id,
          ...message,
          timestamp: new Date(),
        }];
        await this.updateEvent(eventId, { chatMessages: updatedMessages });
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw new Error('Failed to add chat message');
    }
  }

  static async getEventChatMessages(eventId: string): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, 'chatMessages'),
        where('eventId', '==', eventId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as ChatMessage;
      });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw new Error('Failed to get chat messages');
    }
  }

  static async deleteEvent(eventId: string): Promise<void> {
    try {
      // Delete associated chat messages first
      const messagesQuery = query(
        collection(db, 'chatMessages'),
        where('eventId', '==', eventId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the event
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }
} 