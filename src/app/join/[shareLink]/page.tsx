'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase-auth';
import { Calendar, Users, ArrowRight } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  participants: string[];
  createdAt: string;
}

export default function JoinEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (params.shareLink) {
      fetchEvent();
    }
  }, [params.shareLink]);

  // Removed auto-join effect - users must click to join

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/share/${params.shareLink}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvent(data.event);
      } else {
        console.error('Failed to fetch event:', data.error);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAndJoin = async () => {
    try {
      setJoining(true);
      const result = await signInWithGoogle();
      
      if (result.user && event) {
        // Join the event after signing in
        await joinEvent(result.user.email!, result.user.displayName || result.user.email!);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
      setJoining(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user || !event) return;
    
    setJoining(true);
    await joinEvent(user.email!, user.displayName || user.email!);
  };

  const joinEvent = async (userEmail: string, userName: string) => {
    try {
      const response = await fetch(`/api/events/${event?.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to the event page
        router.push(`/events/${event?.id}`);
      } else {
        console.error('Failed to join event:', data.error);
        alert('Failed to join event. Please try again.');
        setJoining(false);
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('An error occurred. Please try again.');
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-600 mb-4">This event link may be invalid or expired.</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Check if user is already a participant
  const isAlreadyParticipant = user && event.participants.some(participantId => 
    // This is a simplified check - in a real app you'd compare user IDs properly
    participantId === user.uid
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
            <p className="text-gray-600">Join this event and start planning together</p>
          </div>

          {/* Event Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h2>
            {event.description && (
              <p className="text-gray-600 text-sm mb-3">{event.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(event.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Current User Status */}
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                Signed in as <span className="font-medium">{user.displayName || user.email}</span>
              </p>
            </div>
          )}

          {/* Join Button or Already Joined Message */}
          {isAlreadyParticipant ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">You're already part of this event!</p>
              </div>
              <button
                onClick={() => router.push(`/events/${event.id}`)}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Event Chat
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          ) : user ? (
            <button
              onClick={handleJoinEvent}
              disabled={joining}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Join Event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSignInAndJoin}
              disabled={joining}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Sign In & Join Event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            By joining, you'll be able to chat with our AI to plan activities, locations, and schedules together.
          </p>
        </div>
      </div>
    </div>
  );
} 