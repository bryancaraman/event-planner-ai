import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Event, ChatMessage } from '@/types';

export class DatabaseService {
  // User operations
  static async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<string> {
    try {
      const userRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: Timestamp.now(),
      });
      return userRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        id: userDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      return {
        id: userDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Event operations
  static async createEvent(eventData: Omit<Event, 'id'>): Promise<string> {
    try {
      // Only include fields that are actually provided
      const firestoreData: any = {
        title: eventData.title,
        creatorId: eventData.creatorId,
        participants: eventData.participants,
        preferences: eventData.preferences,
        shareLink: eventData.shareLink || this.generateShareLink(),
        status: eventData.status || 'planning',
        createdAt: Timestamp.now(),
      };

      // Only add optional fields if they exist
      if (eventData.description) {
        firestoreData.description = eventData.description;
      }
      if (eventData.location) {
        firestoreData.location = eventData.location;
      }
      if (eventData.preferredDates && eventData.preferredDates.length > 0) {
        firestoreData.preferredDates = eventData.preferredDates.map(date => Timestamp.fromDate(date));
      }
      if (eventData.duration) {
        firestoreData.duration = eventData.duration;
      }
      if (eventData.activities) {
        firestoreData.activities = eventData.activities;
      }
      if (eventData.finalizedDate) {
        firestoreData.finalizedDate = Timestamp.fromDate(eventData.finalizedDate);
      }

      const eventRef = await addDoc(collection(db, 'events'), firestoreData);
      return eventRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  static async getEvent(eventId: string): Promise<Event | null> {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        return null;
      }

      const data = eventDoc.data();
      return {
        id: eventDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
        preferredDates: data.preferredDates ? data.preferredDates.map((ts: Timestamp) => ts.toDate()) : [],
        finalizedDate: data.finalizedDate ? data.finalizedDate.toDate() : undefined,
      } as Event;
    } catch (error) {
      console.error('Error getting event:', error);
      throw new Error('Failed to get event');
    }
  }

  static async getEventByShareLink(shareLink: string): Promise<Event | null> {
    try {
      const q = query(collection(db, 'events'), where('shareLink', '==', shareLink));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const eventDoc = querySnapshot.docs[0];
      const data = eventDoc.data();
      return {
        id: eventDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
        preferredDates: data.preferredDates ? data.preferredDates.map((ts: Timestamp) => ts.toDate()) : [],
        finalizedDate: data.finalizedDate ? data.finalizedDate.toDate() : undefined,
      } as Event;
    } catch (error) {
      console.error('Error getting event by share link:', error);
      throw new Error('Failed to get event by share link');
    }
  }

  static async getUserEvents(userId: string): Promise<Event[]> {
    try {
      const q = query(collection(db, 'events'), where('participants', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      
      const events = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
          preferredDates: data.preferredDates ? data.preferredDates.map((ts: Timestamp) => ts.toDate()) : [],
          finalizedDate: data.finalizedDate ? data.finalizedDate.toDate() : undefined,
        } as Event;
      });

      // Sort by creation date (most recent first)
      return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting user events:', error);
      throw new Error('Failed to get user events');
    }
  }

  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    try {
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

      await updateDoc(doc(db, 'events', eventId), updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  static async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  static async addParticipantToEvent(eventId: string, userId: string): Promise<void> {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const data = eventDoc.data();
      const participants = data.participants || [];
      
      if (!participants.includes(userId)) {
        participants.push(userId);
        await updateDoc(doc(db, 'events', eventId), {
          participants,
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error adding participant to event:', error);
      throw new Error('Failed to add participant to event');
    }
  }

  // Chat message operations
  static async addChatMessage(eventId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const messageRef = await addDoc(collection(db, 'chatMessages'), {
        ...messageData,
        eventId,
        timestamp: Timestamp.now(),
      });
      return messageRef.id;
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw new Error('Failed to add chat message');
    }
  }

  static async getEventChatMessages(eventId: string): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, 'chatMessages'), 
        where('eventId', '==', eventId)
      );
      const querySnapshot = await getDocs(q);
      
      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          eventId: data.eventId,
          content: data.content,
          type: data.type,
          userId: data.userId,
          timestamp: data.timestamp.toDate(),
        } as ChatMessage;
      });

      // Sort by creation time (oldest first)
      return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw new Error('Failed to get chat messages');
    }
  }

  // Utility methods
  static generateShareLink(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
} 