'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Share2, Send, Copy, Users, Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  shareLink: string;
  participants: string[];
  createdAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  userId?: string;
  timestamp: string;
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (params.id && user?.email) {
      fetchEvent();
      fetchMessages();
    }
  }, [params.id, user]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}?userEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvent(data.event);
      } else {
        console.error('Failed to fetch event:', data.error);
        if (response.status === 404) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}/chat?userEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user?.email) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(`/api/events/${params.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh messages to get the latest chat
        await fetchMessages();
      } else {
        console.error('Failed to send message:', data.error);
        alert('Failed to send message. Please try again.');
        setNewMessage(messageText); // Restore the message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('An error occurred. Please try again.');
      setNewMessage(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const shareEvent = async () => {
    if (!event) return;
    
    const shareUrl = `${window.location.origin}/join/${event.shareLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${event.title}"`,
          text: 'You\'re invited to plan this event together!',
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    }
  };

  const copyShareLink = async () => {
    if (!event) return;
    
    const shareUrl = `${window.location.origin}/join/${event.shareLink}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    );
  }

  if (!event) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Event not found</h2>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{event.title}</h1>
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
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Link
                </button>
                <button
                  onClick={shareEvent}
                  className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area - Full Width */}
        <div className="flex-1 flex flex-col w-full">
          {/* Messages - Wider Container */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 max-w-2xl mx-auto">
                    <h3 className="text-2xl font-semibold text-blue-900 mb-3">Start Planning! 🎉</h3>
                    <p className="text-blue-800 text-lg">
                      Chat with our AI to plan your event. Ask about locations, activities, scheduling, or anything else!
                    </p>
                    <div className="mt-4 text-sm text-blue-700">
                      Try asking: "What are some fun activities for our group?" or "Help us find a good location"
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-4xl px-6 py-4 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white ml-12'
                          : message.type === 'ai'
                          ? 'bg-white border border-gray-200 text-gray-900 shadow-sm mr-12'
                          : 'bg-gray-100 text-gray-600 text-sm max-w-md'
                      }`}
                    >
                      {message.type === 'ai' && (
                        <div className="flex items-center mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs text-white font-bold">AI</span>
                          </div>
                          <span className="text-sm font-medium text-gray-600">Event Planner</span>
                        </div>
                      )}
                      <p className={`whitespace-pre-wrap leading-relaxed ${
                        message.type === 'ai' ? 'text-base' : 'text-base'
                      }`}>
                        {message.content}
                      </p>
                      <div className={`text-xs mt-3 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input - Wider */}
          <div className="border-t bg-white p-6">
            <div className="max-w-5xl mx-auto">
              <form onSubmit={sendMessage} className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask the AI about locations, activities, scheduling, or anything else..."
                  className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 