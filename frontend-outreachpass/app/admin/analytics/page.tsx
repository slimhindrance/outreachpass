"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Event } from '@/types';
import { useAuth } from '@/lib/auth/auth-context';
import { DateRangePicker } from './components/DateRangePicker';
import { AdvancedFilters } from './components/AdvancedFilters';
import { ComparisonToggle } from './components/ComparisonToggle';
import { ComparisonBadge, ComparisonText } from './components/ComparisonBadge';
import { PDFReportGenerator } from './components/PDFReportGenerator';
import {
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  Eye,
  Wallet,
  Download as DownloadIcon,
  Calendar,
  Activity,
} from 'lucide-react';
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
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsOverview {
  total_emails: number;
  total_email_opens: number;
  total_email_clicks: number;
  total_card_views: number;
  total_wallet_passes: number;
  total_contact_exports: number;
  unique_visitors: number;
  email_open_rate: number;
  email_click_rate: number;
  breakdown?: {
    by_source?: Record<string, number>;
    by_device?: Record<string, number>;
  };
}

interface EmailAnalytics {
  event_type: string;
  count: number;
  occurred_at?: string;
}

interface CardViewAnalytics {
  source_type: string;
  count: number;
  occurred_at?: string;
}

interface WalletAnalytics {
  platform: string;
  event_type: string;
  count: number;
}

export default function AnalyticsPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [dateMode, setDateMode] = useState<'preset' | 'custom'>('preset');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Advanced filter state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState<boolean>(false);

  const { user } = useAuth();

  // Extract tenant_id from authenticated user
  const tenantId = user?.tenantId;

  // Calculate date parameters based on mode
  const getDateParams = (): Record<string, string> => {
    if (dateMode === 'custom' && startDate && endDate) {
      return { start_date: startDate, end_date: endDate };
    }
    return { days: dateRange.replace('d', '') };
  };

  // Calculate previous period dates for comparison
  const getPreviousPeriodParams = (): Record<string, string> | null => {
    if (!comparisonEnabled) return null;

    if (dateMode === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff);

      return {
        start_date: prevStart.toISOString().split('T')[0],
        end_date: prevEnd.toISOString().split('T')[0],
      };
    }

    // For preset ranges, just use the same number of days offset backwards
    const days = parseInt(dateRange.replace('d', ''));
    return { days: days.toString(), offset_days: days.toString() };
  };

  // Fetch events for filter
  const { data: events } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => await apiClient.get<Event[]>('/admin/events'),
  });

  // Fetch analytics overview
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview
  } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview', selectedEventId, dateMode, dateRange, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID available');
      const dateParams = getDateParams();
      const paramsObj: Record<string, string> = {
        tenant_id: tenantId,
        ...dateParams,
      };
      if (selectedEventId) paramsObj.event_id = selectedEventId;
      const params = new URLSearchParams(paramsObj);
      return await apiClient.get<AnalyticsOverview>(`/admin/analytics/overview?${params}`);
    },
    enabled: !!tenantId && (dateMode === 'preset' || (!!startDate && !!endDate)),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch email analytics
  const {
    data: emailAnalytics,
    error: emailError
  } = useQuery<EmailAnalytics[]>({
    queryKey: ['analytics', 'emails', selectedEventId, dateMode, dateRange, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID available');
      const dateParams = getDateParams();
      const paramsObj: Record<string, string> = {
        tenant_id: tenantId,
        ...dateParams,
      };
      if (selectedEventId) paramsObj.event_id = selectedEventId;
      const params = new URLSearchParams(paramsObj);
      return await apiClient.get<EmailAnalytics[]>(`/admin/analytics/emails?${params}`);
    },
    enabled: !!tenantId && (dateMode === 'preset' || (!!startDate && !!endDate)),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch card view analytics
  const {
    data: cardViewAnalytics,
    error: cardViewError
  } = useQuery<CardViewAnalytics[]>({
    queryKey: ['analytics', 'card-views', selectedEventId, dateMode, dateRange, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID available');
      const dateParams = getDateParams();
      const paramsObj: Record<string, string> = {
        tenant_id: tenantId,
        ...dateParams,
      };
      if (selectedEventId) paramsObj.event_id = selectedEventId;
      const params = new URLSearchParams(paramsObj);
      return await apiClient.get<CardViewAnalytics[]>(`/admin/analytics/card-views?${params}`);
    },
    enabled: !!tenantId && (dateMode === 'preset' || (!!startDate && !!endDate)),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch previous period data for comparison
  const { data: previousOverview } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview', 'previous', selectedEventId, dateMode, dateRange, startDate, endDate, comparisonEnabled],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID available');
      const prevParams = getPreviousPeriodParams();
      if (!prevParams) throw new Error('Comparison disabled');

      const paramsObj: Record<string, string> = {
        tenant_id: tenantId,
        ...prevParams,
      };
      if (selectedEventId) paramsObj.event_id = selectedEventId;
      const params = new URLSearchParams(paramsObj);
      return await apiClient.get<AnalyticsOverview>(`/admin/analytics/overview?${params}`);
    },
    enabled: !!tenantId && comparisonEnabled && (dateMode === 'preset' || (!!startDate && !!endDate)),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch wallet analytics
  const {
    data: walletAnalytics,
    error: walletError
  } = useQuery<WalletAnalytics[]>({
    queryKey: ['analytics', 'wallet', selectedEventId, dateMode, dateRange, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID available');
      const dateParams = getDateParams();
      const paramsObj: Record<string, string> = {
        tenant_id: tenantId,
        ...dateParams,
      };
      if (selectedEventId) paramsObj.event_id = selectedEventId;
      const params = new URLSearchParams(paramsObj);
      return await apiClient.get<WalletAnalytics[]>(`/admin/analytics/wallet-passes?${params}`);
    },
    enabled: !!tenantId && (dateMode === 'preset' || (!!startDate && !!endDate)),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Extract available filter options from data
  const availableSources = useMemo(() => {
    if (!cardViewAnalytics) return [];
    return [...new Set(cardViewAnalytics.map(item => item.source_type))];
  }, [cardViewAnalytics]);

  const availableDevices = useMemo(() => {
    if (!overview?.breakdown?.by_device) return [];
    return Object.keys(overview.breakdown.by_device);
  }, [overview]);

  const availablePlatforms = useMemo(() => {
    if (!walletAnalytics) return [];
    return [...new Set(walletAnalytics.map(item => item.platform))];
  }, [walletAnalytics]);

  // Filter data based on selections
  const filteredCardViewAnalytics = useMemo(() => {
    if (!cardViewAnalytics) return [];
    if (selectedSources.length === 0) return cardViewAnalytics;
    return cardViewAnalytics.filter(item => selectedSources.includes(item.source_type));
  }, [cardViewAnalytics, selectedSources]);

  const filteredWalletAnalytics = useMemo(() => {
    if (!walletAnalytics) return [];
    if (selectedPlatforms.length === 0) return walletAnalytics;
    return walletAnalytics.filter(item => selectedPlatforms.includes(item.platform));
  }, [walletAnalytics, selectedPlatforms]);

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSelectedSources([]);
    setSelectedDevices([]);
    setSelectedPlatforms([]);
  };

  const metrics = [
    {
      name: 'Total Emails Sent',
      value: overview?.total_emails || 0,
      icon: Mail,
      change: `${overview?.email_open_rate?.toFixed(1)}% open rate`,
      color: 'bg-blue-500',
    },
    {
      name: 'Card Views',
      value: overview?.total_card_views || 0,
      icon: Eye,
      change: `${overview?.unique_visitors || 0} unique visitors`,
      color: 'bg-purple-500',
    },
    {
      name: 'Wallet Passes',
      value: overview?.total_wallet_passes || 0,
      icon: Wallet,
      change: 'Apple & Google',
      color: 'bg-green-500',
    },
    {
      name: 'Contact Exports',
      value: overview?.total_contact_exports || 0,
      icon: DownloadIcon,
      change: 'VCard downloads',
      color: 'bg-orange-500',
    },
  ];

  const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#CA8A04', '#059669'];

  const exportData = () => {
    if (!overview) return;

    const dateRangeText = dateMode === 'custom'
      ? `${startDate} to ${endDate}`
      : `Last ${dateRange}`;

    const csvData = [
      ['OutreachPass Analytics Export'],
      [`Generated: ${new Date().toISOString()}`],
      [`Event: ${selectedEventId ? events?.find(e => e.event_id === selectedEventId)?.name : 'All Events'}`],
      [`Date Range: ${dateRangeText}`],
      [''],
      ['Overview Metrics'],
      ['Metric', 'Value'],
      ['Total Emails', overview.total_emails],
      ['Email Opens', overview.total_email_opens],
      ['Email Clicks', overview.total_email_clicks],
      ['Open Rate', `${overview.email_open_rate.toFixed(2)}%`],
      ['Click Rate', `${overview.email_click_rate.toFixed(2)}%`],
      ['Card Views', overview.total_card_views],
      ['Unique Visitors', overview.unique_visitors],
      ['Wallet Passes', overview.total_wallet_passes],
      ['Contact Exports', overview.total_contact_exports],
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outreachpass-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      {!tenantId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Tenant ID Missing</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Your user profile does not have a tenant ID. Analytics data cannot be loaded without it.
                Please contact support if this issue persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {overviewError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to Load Analytics</h3>
                <p className="mt-1 text-sm text-red-700">
                  {(overviewError as Error).message || 'An error occurred while loading analytics data. Please try again.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => refetchOverview()}
              className="ml-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Comprehensive tracking of email engagement, card views, wallet passes, and contact exports
          </p>
          <div className="mt-3">
            <ComparisonToggle
              enabled={comparisonEnabled}
              setEnabled={setComparisonEnabled}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <DateRangePicker
            dateMode={dateMode}
            setDateMode={setDateMode}
            dateRange={dateRange}
            setDateRange={setDateRange}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
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
          <AdvancedFilters
            selectedSources={selectedSources}
            setSelectedSources={setSelectedSources}
            availableSources={availableSources}
            selectedDevices={selectedDevices}
            setSelectedDevices={setSelectedDevices}
            availableDevices={availableDevices}
            selectedPlatforms={selectedPlatforms}
            setSelectedPlatforms={setSelectedPlatforms}
            availablePlatforms={availablePlatforms}
            onClearAll={handleClearAllFilters}
          />
          <button
            onClick={exportData}
            disabled={!overview}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DownloadIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
          <PDFReportGenerator
            overview={overview}
            emailAnalytics={emailAnalytics}
            cardViewAnalytics={cardViewAnalytics}
            walletAnalytics={walletAnalytics}
            dateRange={dateRange}
            dateMode={dateMode}
            startDate={startDate}
            endDate={endDate}
            eventName={selectedEventId ? events?.find(e => e.event_id === selectedEventId)?.name : undefined}
            comparisonEnabled={comparisonEnabled}
            previousOverview={previousOverview}
          />
        </div>
      </div>

      {overviewLoading ? (
        <>
          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                <div className="h-64 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {metrics.map((metric) => {
              const previousValue = previousOverview
                ? metric.name === 'Total Emails Sent' ? previousOverview.total_emails
                : metric.name === 'Card Views' ? previousOverview.total_card_views
                : metric.name === 'Wallet Passes' ? previousOverview.total_wallet_passes
                : metric.name === 'Contact Exports' ? previousOverview.total_contact_exports
                : 0
                : 0;

              return (
                <div key={metric.name} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${metric.color}`}>
                      <metric.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{metric.change}</p>
                      {comparisonEnabled && previousOverview && (
                        <ComparisonBadge
                          currentValue={metric.value}
                          previousValue={previousValue}
                        />
                      )}
                    </div>
                    {comparisonEnabled && previousOverview && (
                      <div className="mt-2">
                        <ComparisonText
                          currentValue={metric.value}
                          previousValue={previousValue}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Email Funnel */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Mail className="h-5 w-5 mr-2 text-blue-600" />
              Email Engagement Funnel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Emails Sent</p>
                <p className="text-4xl font-bold text-blue-600">{overview?.total_emails || 0}</p>
                <p className="text-xs text-gray-500 mt-1">100%</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Opened</p>
                <p className="text-4xl font-bold text-purple-600">{overview?.total_email_opens || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{overview?.email_open_rate?.toFixed(1)}% of sent</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Clicked</p>
                <p className="text-4xl font-bold text-green-600">{overview?.total_email_clicks || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{overview?.email_click_rate?.toFixed(1)}% of opened</p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Email Events Breakdown */}
            <div id="email-funnel-chart" className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Email Event Distribution
              </h2>
              {emailAnalytics && emailAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emailAnalytics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ event_type, percent }) =>
                        `${event_type}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="event_type"
                    >
                      {emailAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <Mail className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-900 font-medium mb-1">No Email Data Yet</p>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    Email analytics will appear here once contacts start receiving and interacting with emails.
                  </p>
                </div>
              )}
            </div>

            {/* Card View Sources */}
            <div id="card-source-chart" className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Card View Sources
                {selectedSources.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">({selectedSources.length} filtered)</span>
                )}
              </h2>
              {filteredCardViewAnalytics && filteredCardViewAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredCardViewAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source_type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#7C3AED" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <Eye className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-900 font-medium mb-1">No Card Views Yet</p>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    Card view analytics will appear here once visitors start viewing digital business cards.
                  </p>
                </div>
              )}
            </div>

            {/* Wallet Pass Breakdown */}
            <div id="wallet-platform-chart" className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Wallet Pass Activity
                {selectedPlatforms.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">({selectedPlatforms.length} filtered)</span>
                )}
              </h2>
              {filteredWalletAnalytics && filteredWalletAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredWalletAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <Wallet className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-900 font-medium mb-1">No Wallet Passes Yet</p>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    Wallet pass analytics will appear here once contacts start saving passes to Apple Wallet or Google Wallet.
                  </p>
                </div>
              )}
            </div>

            {/* Engagement Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Overall Engagement
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Total Views</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{overview?.total_card_views || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Unique Visitors</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{overview?.unique_visitors || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <Wallet className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Wallet Saves</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{overview?.total_wallet_passes || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <DownloadIcon className="h-5 w-5 text-orange-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Contact Exports</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{overview?.total_contact_exports || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time-Series Charts */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trends Over Time</h2>

            <div className="grid grid-cols-1 gap-6">
              {/* Email Engagement Over Time */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Email Engagement Trends
                </h3>
                {emailAnalytics && emailAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={emailAnalytics.filter(e => e.occurred_at).map(e => ({
                        date: new Date(e.occurred_at!).toLocaleDateString(),
                        count: e.count,
                        event_type: e.event_type,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#2563EB"
                        fill="#2563EB"
                        fillOpacity={0.3}
                        name="Events"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                    <TrendingUp className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No Trend Data Available</p>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Email engagement trends will appear here once there&apos;s historical data to display.
                    </p>
                  </div>
                )}
              </div>

              {/* Card Views Over Time */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-600" />
                  Card View Activity
                  {selectedSources.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500">({selectedSources.length} filtered)</span>
                  )}
                </h3>
                {filteredCardViewAnalytics && filteredCardViewAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={filteredCardViewAnalytics.filter(c => c.occurred_at).map(c => ({
                        date: new Date(c.occurred_at!).toLocaleDateString(),
                        count: c.count,
                        source: c.source_type,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#7C3AED"
                        fill="#7C3AED"
                        fillOpacity={0.3}
                        name="Views"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                    <Activity className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No Activity Data Available</p>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Card view activity trends will appear here once there&apos;s historical data to display.
                    </p>
                  </div>
                )}
              </div>

              {/* Wallet Pass Activity Over Time */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-green-600" />
                  Wallet Pass Adoption
                  {selectedPlatforms.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500">({selectedPlatforms.length} filtered)</span>
                  )}
                </h3>
                {filteredWalletAnalytics && filteredWalletAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={filteredWalletAnalytics.map((w, idx) => ({
                        platform: w.platform,
                        count: w.count,
                        event_type: w.event_type,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#059669"
                        fill="#059669"
                        fillOpacity={0.3}
                        name="Passes"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                    <Wallet className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No Adoption Data Available</p>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Wallet pass adoption trends will appear here once there&apos;s historical data to display.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Tables */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                📧 Last email event: {emailAnalytics?.[0]?.occurred_at ? new Date(emailAnalytics[0].occurred_at).toLocaleString() : 'N/A'}
              </p>
              <p className="mb-2">
                👁️ Last card view: {cardViewAnalytics?.[0]?.occurred_at ? new Date(cardViewAnalytics[0].occurred_at).toLocaleString() : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                💡 Tip: Export data to CSV for deeper analysis in Excel or Google Sheets
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
