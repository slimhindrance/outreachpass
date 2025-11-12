"use client";

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { DashboardStats } from '@/types';
import { Calendar, Users, QrCode, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardStats>('/admin/stats');
      return response;
    },
  });

  const statCards = [
    {
      name: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      href: '/admin/events/',
    },
    {
      name: 'Active Events',
      value: stats?.activeEvents || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      href: '/admin/events/',
    },
    {
      name: 'Total Attendees',
      value: stats?.totalAttendees || 0,
      icon: Users,
      color: 'bg-purple-500',
      href: '/admin/attendees/',
    },
    {
      name: 'Total Scans',
      value: stats?.totalScans || 0,
      icon: QrCode,
      color: 'bg-orange-500',
      href: '/admin/analytics/',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here is an overview of your events and activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <a
            key={stat.name}
            href={stat.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {isLoading ? '-' : stat.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="/admin/events/new/"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition text-center"
          >
            <Calendar className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
            <h3 className="text-sm font-medium text-gray-900">Create Event</h3>
            <p className="mt-1 text-xs text-gray-500">Set up a new networking event</p>
          </a>

          <a
            href="/admin/attendees/"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition text-center"
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
            <h3 className="text-sm font-medium text-gray-900">Manage Attendees</h3>
            <p className="mt-1 text-xs text-gray-500">Import or edit attendees</p>
          </a>

          <a
            href="/admin/analytics/"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition text-center"
          >
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
            <h3 className="text-sm font-medium text-gray-900">View Analytics</h3>
            <p className="mt-1 text-xs text-gray-500">Track engagement metrics</p>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <p className="text-sm text-gray-500 text-center py-8">
              No recent activity to display
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
