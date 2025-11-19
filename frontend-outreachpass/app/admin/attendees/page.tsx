"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Attendee, Event } from '@/types';
import { Upload, Search, Users, Mail, Phone, Building, UserPlus } from 'lucide-react';
import { CSVImport } from '@/components/admin/CSVImport';
import { AddAttendeeModal, AttendeeFormData } from '@/components/admin/AddAttendeeModal';

export default function AttendeesPage() {
  const [showImport, setShowImport] = useState(false);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch events for filter
  const { data: events } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => await apiClient.get<Event[]>('/admin/events'),
  });

  // Fetch attendees for selected event
  const { data: attendees, refetch: refetchAttendees } = useQuery<Attendee[]>({
    queryKey: ['attendees', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      return await apiClient.get<Attendee[]>(`/admin/events/${selectedEventId}/attendees`);
    },
    enabled: !!selectedEventId,
  });

  const handleImport = async (file: File) => {
    if (!selectedEventId) {
      throw new Error('Please select an event first');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/events/${selectedEventId}/attendees/import`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Import failed');
    }

    const result = await response.json();
    await refetchAttendees();
    return result;
  };

  const handleAddAttendee = async (attendeeData: AttendeeFormData) => {
    if (!selectedEventId) {
      throw new Error('Please select an event first');
    }

    try {
      await apiClient.post(
        `/admin/events/${selectedEventId}/attendees`,
        {
          ...attendeeData,
          event_id: selectedEventId,
        }
      );
      await refetchAttendees();
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('An attendee with this email already exists for this event');
      }
      throw new Error(error.response?.data?.detail || 'Failed to add attendee');
    }
  };

  const filteredAttendees = attendees?.filter(attendee => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      attendee.first_name?.toLowerCase().includes(query) ||
      attendee.last_name?.toLowerCase().includes(query) ||
      attendee.email?.toLowerCase().includes(query) ||
      attendee.org_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendees</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage event attendees and issue passes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddAttendee(true)}
            disabled={!selectedEventId}
            className="inline-flex items-center px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add Attendee
          </button>
          <button
            onClick={() => setShowImport(true)}
            disabled={!selectedEventId}
            className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5 mr-2" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Select Event</option>
            {events?.map((event) => (
              <option key={event.event_id} value={event.event_id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {!selectedEventId ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an event</h3>
          <p className="text-gray-500">
            Choose an event from the dropdown above to view and manage attendees
          </p>
        </div>
      ) : filteredAttendees && filteredAttendees.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendees.map((attendee) => (
                <tr
                  key={attendee.attendee_id}
                  onClick={() => window.location.href = `/admin/attendees/${attendee.attendee_id}`}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {attendee.first_name} {attendee.last_name}
                    </div>
                    {attendee.title && (
                      <div className="text-sm text-gray-500">{attendee.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attendee.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-1" />
                        {attendee.email}
                      </div>
                    )}
                    {attendee.phone && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Phone className="h-4 w-4 mr-1" />
                        {attendee.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attendee.org_name && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="h-4 w-4 mr-1" />
                        {attendee.org_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      attendee.card_id
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {attendee.card_id ? 'Pass Issued' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attendees yet</h3>
          <p className="text-gray-500 mb-6">
            Import attendees from a CSV file to get started
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
          >
            <Upload className="h-5 w-5 mr-2" />
            Import Attendees
          </button>
        </div>
      )}

      {/* Add Attendee Modal */}
      <AddAttendeeModal
        isOpen={showAddAttendee}
        onClose={() => setShowAddAttendee(false)}
        onAdd={handleAddAttendee}
      />

      {/* CSV Import Modal */}
      <CSVImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        templateColumns={[
          'first_name',
          'last_name',
          'email',
          'phone',
          'org_name',
          'title',
          'linkedin_url',
          'role',
        ]}
      />
    </div>
  );
}
