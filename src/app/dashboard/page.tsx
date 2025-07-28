'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Calendar, Users, MapPin, LogOut } from 'lucide-react';
import { Event } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase-auth';
import { AuthGuard } from '@/components/auth-guard';

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewEvent = () => {
    router.push('/create-event');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Event Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={user?.photoURL || ''}
                  alt={user?.displayName || ''}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {user?.displayName}
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName?.split(' ')[0]}!
          </h2>
          <p className="text-gray-600">
            Manage your events and coordinate with friends using AI-powered planning.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={createNewEvent}
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-8 w-8 mb-2" />
              <div className="text-left">
                <h3 className="font-semibold">Create New Event</h3>
                <p className="text-sm opacity-90">Start planning with AI assistance</p>
              </div>
            </button>
            
            <div className="bg-white p-6 rounded-lg border">
              <Calendar className="h-8 w-8 text-green-600 mb-2" />
              <div>
                <h3 className="font-semibold text-gray-900">Calendar Sync</h3>
                <p className="text-sm text-gray-600">Connected to Google Calendar</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <div>
                <h3 className="font-semibold text-gray-900">Active Events</h3>
                <p className="text-sm text-gray-600">{events.length} events total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Your Events</h3>
            <button
              onClick={createNewEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Event</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first event to start planning with AI assistance
              </p>
              <button
                onClick={createNewEvent}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg text-gray-900 truncate">
                        {event.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        event.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                        event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="truncate">{event.location.address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {event.finalizedDate 
                            ? new Date(event.finalizedDate).toLocaleDateString()
                            : `${event.preferredDates.length} date option${event.preferredDates.length !== 1 ? 's' : ''}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
} 