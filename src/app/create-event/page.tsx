'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Clock, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth-guard';

function CreateEventContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    duration: 120,
    preferredDates: [''],
    preferences: {
      timeOfDay: 'flexible',
      activityTypes: [],
      budget: { min: 0, max: 1000 },
      accessibility: [],
      dietaryRestrictions: [],
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (index: number, value: string) => {
    const newDates = [...formData.preferredDates];
    newDates[index] = value;
    setFormData(prev => ({ ...prev, preferredDates: newDates }));
  };

  const addDateOption = () => {
    setFormData(prev => ({
      ...prev,
      preferredDates: [...prev.preferredDates, '']
    }));
  };

  const removeDateOption = (index: number) => {
    if (formData.preferredDates.length > 1) {
      const newDates = formData.preferredDates.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, preferredDates: newDates }));
    }
  };

  const handleActivityTypeChange = (activity: string) => {
    const newTypes = formData.preferences.activityTypes.includes(activity)
      ? formData.preferences.activityTypes.filter(t => t !== activity)
      : [...formData.preferences.activityTypes, activity];
    
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, activityTypes: newTypes }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          preferredDates: formData.preferredDates.filter(date => date !== ''),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/events/${data.event.id}`);
      } else {
        const error = await response.json();
        console.error('Error creating event:', error);
        alert('Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activityTypes = [
    'Dining', 'Entertainment', 'Outdoor Activities', 'Museums', 'Shopping',
    'Sports', 'Arts & Culture', 'Nightlife', 'Tours', 'Wellness'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Event Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Weekend Hangout, Birthday Celebration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell participants what this event is about..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City, neighborhood, or address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="30"
                    max="1440"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferred Dates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Preferred Dates</h2>
            
            <div className="space-y-3">
              {formData.preferredDates.map((date, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.preferredDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDateOption(index)}
                      className="text-red-600 hover:text-red-800 px-2 py-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addDateOption}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add another date option
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time of Day
                </label>
                <select
                  value={formData.preferences.timeOfDay}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, timeOfDay: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="flexible">Flexible</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Types (select all that interest you)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {activityTypes.map((activity) => (
                    <label key={activity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.preferences.activityTypes.includes(activity)}
                        onChange={() => handleActivityTypeChange(activity)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{activity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Creating...' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <AuthGuard>
      <CreateEventContent />
    </AuthGuard>
  );
} 