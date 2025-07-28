import { Activity } from '@/types';

export class GoogleMapsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  }

  async searchPlaces(
    query: string,
    location: { lat: number; lng: number },
    radius: number = 5000,
    type?: string
  ): Promise<Activity[]> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      const params = new URLSearchParams({
        query,
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        key: this.apiKey,
      });

      if (type) {
        params.append('type', type);
      }

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.results?.map((place: any) => ({
        id: place.place_id,
        name: place.name,
        type: place.types?.[0] || 'unknown',
        location: {
          address: place.formatted_address,
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
        },
        duration: this.estimateDuration(place.types),
        rating: place.rating,
        description: place.types?.join(', '),
        placeId: place.place_id,
      })) || [];
    } catch (error) {
      console.error('Error searching places:', error);
      throw new Error('Failed to search places');
    }
  }

  async getPlaceDetails(placeId: string): Promise<Activity | null> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,rating,types,price_level,opening_hours,photos',
        key: this.apiKey,
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const place = data.result;
      return {
        id: place.place_id,
        name: place.name,
        type: place.types?.[0] || 'unknown',
        location: {
          address: place.formatted_address,
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
        },
        duration: this.estimateDuration(place.types),
        cost: this.estimateCost(place.price_level),
        rating: place.rating,
        description: place.types?.join(', '),
        placeId: place.place_id,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = new URLSearchParams({
        address,
        key: this.apiKey,
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        return null;
      }

      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  async getSuggestedActivities(
    location: { lat: number; lng: number },
    preferences: string[],
    radius: number = 10000
  ): Promise<Activity[]> {
    const activities: Activity[] = [];
    
    const searchQueries = [
      'restaurants',
      'entertainment',
      'tourist_attraction',
      'museum',
      'park',
      'shopping_mall',
      'movie_theater',
      'amusement_park',
      'zoo',
      'art_gallery',
    ];

    for (const query of searchQueries) {
      try {
        const results = await this.searchPlaces(query, location, radius, query);
        activities.push(...results.slice(0, 3)); // Top 3 results for each category
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
      }
    }

    // Remove duplicates and sort by rating
    const uniqueActivities = activities.filter(
      (activity, index, self) => 
        index === self.findIndex((a) => a.placeId === activity.placeId)
    );

    return uniqueActivities
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);
  }

  private estimateDuration(types: string[] = []): number {
    const typeToMinutes: { [key: string]: number } = {
      restaurant: 90,
      cafe: 45,
      museum: 120,
      park: 60,
      shopping_mall: 120,
      movie_theater: 150,
      tourist_attraction: 90,
      amusement_park: 240,
      zoo: 180,
      art_gallery: 90,
    };

    for (const type of types) {
      if (typeToMinutes[type]) {
        return typeToMinutes[type];
      }
    }

    return 60; // Default 1 hour
  }

  private estimateCost(priceLevel?: number): number {
    const costMap: { [key: number]: number } = {
      0: 0,   // Free
      1: 15,  // Inexpensive
      2: 30,  // Moderate
      3: 60,  // Expensive
      4: 100, // Very Expensive
    };

    return costMap[priceLevel || 0];
  }
} 