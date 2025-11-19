"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Event, Attendee } from '@/types';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  QrCode,
  Settings,
  Trash2,
  Edit,
  Download,
  BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useParams } from 'next/navigation';
import {
  useEventSummary,
  useEventTimeSeries,
  useDeviceBreakdown,
  useConversionFunnel,
} from '@/lib/hooks/useEnhancedAnalytics';
import { MetricsCards } from '@/components/analytics/MetricsCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { DeviceBreakdownCharts } from '@/components/analytics/DeviceBreakdownCharts';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'attendees' | 'analytics' | 'settings'>('details');

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => await apiClient.get<Event>(`/admin/events/${eventId}`),
    enabled: !!eventId,
  });

  const { data: attendees } = useQuery<Attendee[]>({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => await apiClient.get<Attendee[]>(`/admin/events/${eventId}/attendees`),
    enabled: !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: Partial<Event>) => {
      return await apiClient.put(`/admin/events/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(`/admin/events/${eventId}`);
    },
    onSuccess: () => {
      window.location.href = '/admin/events/';
    },
  });

  const handleStatusChange = (status: string) => {
    updateEventMutation.mutate({ status: status as 'draft' | 'active' | 'completed' | 'cancelled' });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      deleteEventMutation.mutate();
    }
  };

  const downloadAttendeeList = () => {
    if (!attendees) return;

    const csvData = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Organization', 'Title', 'Status'],
      ...attendees.map((a) => [
        a.first_name,
        a.last_name,
        a.email,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Event not found</h2>
        <a href="/admin/events/" className="text-brand-primary hover:underline mt-4 inline-block">
          Back to Events
        </a>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <a
          href="/admin/events/"
          className="inline-flex items-center text-sm text-brand-primary hover:text-brand-primary/80 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </a>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
            <p className="mt-2 text-sm text-gray-600">{event.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(event.status)}
            <a
              href={`/admin/events/${eventId}/edit/`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </a>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Event Details
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attendees'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Attendees ({attendees?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Event Information</h2>
              <dl className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(event.starts_at)} - {formatDate(event.ends_at)}
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">{event.timezone}</dd>
                  </div>
                </div>
                {event.location && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="text-sm text-gray-900">{event.location}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Attendees</dt>
                    <dd className="text-sm text-gray-900">{attendees?.length || 0}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Passes Issued</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {attendees?.filter((a) => a.card_id).length || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {attendees?.filter((a) => !a.card_id).length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <a
                  href={`/admin/events/${eventId}/attendees/`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Attendees
                </a>
                <button
                  onClick={downloadAttendeeList}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Attendees
                </button>
                <a
                  href={`/admin/analytics/?event=${eventId}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  View Analytics
                </a>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Event Status</h2>
              <select
                value={event.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Change the event status to control visibility and access
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendees' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Attendees ({attendees?.length || 0})
            </h2>
            <button
              onClick={downloadAttendeeList}
              className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          {attendees && attendees.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
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
                {attendees.map((attendee) => (
                  <tr key={attendee.attendee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {attendee.first_name} {attendee.last_name}
                      </div>
                      {attendee.title && (
                        <div className="text-sm text-gray-500">{attendee.title}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendee.org_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          attendee.card_id
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {attendee.card_id ? 'Pass Issued' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No attendees yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <EnhancedAnalyticsTab eventId={eventId} />
      )}

      {activeTab === 'settings' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Event Settings</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event URL Slug
              </label>
              <input
                type="text"
                value={event.slug}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Event URL: https://app.outreachpass.base2ml.com/e/{event.slug}
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-brand-primary mr-3" />
                <span className="text-sm text-gray-700">
                  Enable automatic pass generation for new attendees
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-brand-primary mr-3" />
                <span className="text-sm text-gray-700">
                  Send email notifications to attendees
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-brand-primary mr-3" />
                <span className="text-sm text-gray-700">Allow QR code sharing</span>
              </label>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Event
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Once deleted, this event and all associated data cannot be recovered.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Analytics Tab Component
function EnhancedAnalyticsTab({ eventId }: { eventId: string }) {
  const [days, setDays] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'downloads' | 'wallet_adds' | 'emails_sent'>('views');
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week'>('day');

  // Fetch analytics data
  const { data: summary, isLoading: summaryLoading } = useEventSummary(eventId, { days });
  const { data: timeSeries, isLoading: timeSeriesLoading } = useEventTimeSeries(eventId, {
    metric: selectedMetric,
    granularity,
    days,
  });
  const { data: devices, isLoading: devicesLoading } = useDeviceBreakdown(eventId, { days });
  const { data: funnel, isLoading: funnelLoading } = useConversionFunnel(eventId, { days });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Chart Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="views">Card Views</option>
            <option value="downloads">vCard Downloads</option>
            <option value="wallet_adds">Wallet Adds</option>
            <option value="emails_sent">Emails Sent</option>
          </select>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      {summary && <MetricsCards data={summary} loading={summaryLoading} />}

      {/* Time Series Chart */}
      {timeSeries && <TimeSeriesChart data={timeSeries} loading={timeSeriesLoading} />}

      {/* Device Breakdown */}
      {devices && <DeviceBreakdownCharts data={devices} loading={devicesLoading} />}

      {/* Conversion Funnel */}
      {funnel && <ConversionFunnel data={funnel} loading={funnelLoading} />}
    </div>
  );
}
