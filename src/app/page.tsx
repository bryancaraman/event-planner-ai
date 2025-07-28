'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Calendar, Users, Brain, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase-auth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Event Planner AI</span>
            </div>
            <button
              onClick={handleSignIn}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
            >
              Sign In with Google
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Plan Events with
            <span className="text-blue-600"> AI Intelligence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Coordinate schedules, discover activities, and plan perfect events with our AI assistant that works with Google Calendar and Maps.
          </p>
          <button
            onClick={handleSignIn}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started for Free
          </button>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-gray-600">AI analyzes everyone's calendars to find the perfect meeting time</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Location Intelligence</h3>
            <p className="text-gray-600">Discover activities and venues that match your group's preferences</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Easy Collaboration</h3>
            <p className="text-gray-600">Share event links for seamless group planning and coordination</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <Brain className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
            <p className="text-gray-600">Chat with AI to refine plans and get personalized suggestions</p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Event</h3>
              <p className="text-gray-600">Set up your event details and invite participants via shareable link</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Calendars</h3>
              <p className="text-gray-600">Participants link their Google Calendars for automatic scheduling</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Planning</h3>
              <p className="text-gray-600">Our AI suggests optimal times and activities based on preferences</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Event Planner AI. Built with Next.js, Firebase, and AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
