"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Attendee, Event } from '@/types';
import {
  Upload,
  Search,
  Users,
  Mail,
  Phone,
  Building,
  ArrowLeft,
  Download
} from 'lucide-react';
import { CSVImport } from '@/components/admin/CSVImport';

export default function EventAttendeesPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch event details
  const { data: event, isLoading: loadingEvent } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => await apiClient.get<Event>(`/admin/events/${eventId}`),
    enabled: !!eventId,
  });

  // Fetch attendees for this event
  const { data: attendees, refetch: refetchAttendees, isLoading: loadingAttendees } = useQuery<Attendee[]>({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => await apiClient.get<Attendee[]>(`/admin/events/${eventId}/attendees`),
    enabled: !!eventId,
  });

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/events/${eventId}/attendees/import`,
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

  const downloadAttendeeList = () => {
    if (!attendees) return;

    const csvData = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Organization', 'Title', 'Status'],
      ...attendees.map((a) => [
        a.first_name || '',
        a.last_name || '',
        a.email || '',
        a.phone || '',
        a.org_name || '',
        a.title || '',
        a.card_id ? 'Pass Issued' : 'Pending',
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.slug || eventId}-attendees.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  if (loadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with breadcrumb */}
      <div className="mb-8">
        <a
          href={`/admin/events/${eventId}/`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-brand-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Event
        </a>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event?.name} - Attendees</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage attendees and issue passes for this event
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadAttendeeList}
              disabled={!attendees || attendees.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {attendees && attendees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attendees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{attendees.length}</p>
              </div>
              <Users className="h-8 w-8 text-brand-primary" />
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Passes Issued</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {attendees.filter(a => a.card_id).length}
                </p>
              </div>
              <div className="h-8 w-8 text-green-600 font-bold flex items-center justify-center">
                ✓
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {attendees.filter(a => !a.card_id).length}
                </p>
              </div>
              <div className="h-8 w-8 text-gray-400 font-bold flex items-center justify-center">
                ⏳
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendees by name, email, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      {loadingAttendees ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
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
                <tr key={attendee.attendee_id} className="hover:bg-gray-50">
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
