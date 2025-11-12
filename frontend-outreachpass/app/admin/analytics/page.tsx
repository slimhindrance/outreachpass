"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Event } from '@/types';
import { BarChart3, TrendingUp, Users, QrCode, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  totalScans: number;
  activeAttendees: number;
  engagementRate: number;
  passDownloads: number;
  scansOverTime: Array<{ date: string; scans: number }>;
  topNetworkers: Array<{ name: string; scans: number }>;
  scansByEvent: Array<{ name: string; scans: number }>;
}

export default function AnalyticsPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Fetch events for filter
  const { data: events } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => await apiClient.get<Event[]>('/admin/events'),
  });

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', selectedEventId],
    queryFn: async () => {
      const endpoint = selectedEventId
        ? `/admin/events/${selectedEventId}/analytics`
        : '/admin/analytics';
      return await apiClient.get<AnalyticsData>(endpoint);
    },
  });

  const metrics = [
    {
      name: 'Total Scans',
      value: analytics?.totalScans || 0,
      change: '+12%',
      icon: QrCode,
      trend: 'up',
    },
    {
      name: 'Active Attendees',
      value: analytics?.activeAttendees || 0,
      change: '+8%',
      icon: Users,
      trend: 'up',
    },
    {
      name: 'Engagement Rate',
      value: analytics?.engagementRate
        ? `${analytics.engagementRate.toFixed(1)}%`
        : '0%',
      change: '+5%',
      icon: TrendingUp,
      trend: 'up',
    },
    {
      name: 'Pass Downloads',
      value: analytics?.passDownloads || 0,
      change: '+15%',
      icon: BarChart3,
      trend: 'up',
    },
  ];

  const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#CA8A04'];

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Scans', analytics.totalScans],
      ['Active Attendees', analytics.activeAttendees],
      ['Engagement Rate', `${analytics.engagementRate}%`],
      ['Pass Downloads', analytics.passDownloads],
      [''],
      ['Top Networkers'],
      ['Name', 'Scans'],
      ...analytics.topNetworkers.map((n) => [n.name, n.scans]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedEventId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track engagement and networking activity across your events
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">All Events</option>
            {events?.map((event) => (
              <option key={event.event_id} value={event.event_id}>
                {event.name}
              </option>
            ))}
          </select>
          <button
            onClick={exportData}
            disabled={!analytics}
            className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition disabled:opacity-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {metrics.map((metric) => (
              <div key={metric.name} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className="h-8 w-8 text-brand-primary" />
                  <span
                    className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.change}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{metric.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Scans Over Time */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Scan Activity Over Time
              </h2>
              {analytics?.scansOverTime && analytics.scansOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.scansOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="scans"
                      stroke="#2563EB"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">No scan data available</p>
                </div>
              )}
            </div>

            {/* Scans by Event */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Scans by Event
              </h2>
              {analytics?.scansByEvent && analytics.scansByEvent.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.scansByEvent}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="scans"
                    >
                      {analytics.scansByEvent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">No event data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Networkers */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Top Networkers</h2>
            {analytics?.topNetworkers && analytics.topNetworkers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topNetworkers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="scans" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500">No networking data available</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
