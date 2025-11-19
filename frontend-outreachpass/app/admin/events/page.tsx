"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Event } from '@/types';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  BarChart3,
  TrendingUp,
  Clock,
  Archive,
  Download,
  MoreVertical,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await apiClient.get<Event[]>('/admin/events');
      return response;
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      await Promise.all(
        eventIds.map(id => apiClient.delete(`/admin/events/${id}`))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvents(new Set());
      setShowBulkActions(false);
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ eventIds, status }: { eventIds: string[], status: string }) => {
      await Promise.all(
        eventIds.map(id => apiClient.put(`/admin/events/${id}`, { status }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvents(new Set());
      setShowBulkActions(false);
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!events) return null;

    return {
      total: events.length,
      active: events.filter(e => e.status === 'active').length,
      draft: events.filter(e => e.status === 'draft').length,
      completed: events.filter(e => e.status === 'completed').length,
      upcoming: events.filter(e => {
        const startDate = new Date(e.starts_at);
        return startDate > new Date() && e.status !== 'cancelled';
      }).length,
    };
  }, [events]);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = events;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [events, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedEvents.size === filteredEvents.length) {
      setSelectedEvents(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedEvents(new Set(filteredEvents.map(e => e.event_id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedEvents.size} event(s)? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedEvents));
    }
  };

  const handleBulkStatusChange = (status: string) => {
    bulkStatusMutation.mutate({
      eventIds: Array.from(selectedEvents),
      status
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-brand-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-brand-primary opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                </div>
                <Calendar className="h-8 w-8 text-gray-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
                </div>
                <Archive className="h-8 w-8 text-blue-700 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by name, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredEvents.length} of {events?.length || 0} events
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-brand-primary/10 border border-brand-primary rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">
                {selectedEvents.size} event(s) selected
              </span>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusChange('active')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Set Active
                </button>
                <button
                  onClick={() => handleBulkStatusChange('completed')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleBulkStatusChange('cancelled')}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedEvents(new Set());
                setShowBulkActions(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div>
          {/* Select All */}
          <div className="bg-white shadow rounded-t-lg p-4 border-b flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {selectedEvents.size === filteredEvents.length ? (
                <CheckSquare className="h-5 w-5 text-brand-primary" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              Select All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-0">
            {filteredEvents.map((event, index) => (
              <div
                key={event.event_id}
                className={`bg-white shadow hover:shadow-md transition ${
                  index === filteredEvents.length - 1 ? 'rounded-b-lg' : ''
                } ${selectedEvents.has(event.event_id) ? 'ring-2 ring-brand-primary' : ''}`}
              >
                <div className="p-6 flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleEventSelection(event.event_id)}
                    className="mt-1"
                  >
                    {selectedEvents.has(event.event_id) ? (
                      <CheckSquare className="h-5 w-5 text-brand-primary" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(event.status)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4">
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

                    <div className="flex gap-2">
                      <a
                        href={`/admin/events/${event.event_id}/`}
                        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition text-sm"
                      >
                        View Details
                      </a>
                      <a
                        href={`/admin/events/${event.event_id}/attendees/`}
                        className="px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/5 transition text-sm flex items-center"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Attendees
                      </a>
                      <a
                        href={`/admin/analytics?event_id=${event.event_id}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex items-center"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          {searchQuery || statusFilter !== 'all' ? (
            <>
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-brand-primary hover:text-brand-primary/80 font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
