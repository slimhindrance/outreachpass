"use client";

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Event } from '@/types';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function EventsPage() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await apiClient.get<Event[]>('/admin/events');
      return response;
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your networking events and conferences
          </p>
        </div>
        <a
          href="/admin/events/new/"
          className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </a>
      </div>

      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {events.map((event) => (
            <div key={event.event_id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                  {getStatusBadge(event.status)}
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(event.starts_at)} - {formatDate(event.ends_at)}
                  </div>
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2">
                  <a
                    href={`/admin/events/${event.event_id}/`}
                    className="flex-1 text-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition text-sm"
                  >
                    View Details
                  </a>
                  <a
                    href={`/admin/events/${event.event_id}/attendees/`}
                    className="flex-1 text-center px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/5 transition text-sm flex items-center justify-center"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Attendees
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first networking event
          </p>
          <a
            href="/admin/events/new/"
            className="inline-flex items-center px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Event
          </a>
        </div>
      )}
    </div>
  );
}
