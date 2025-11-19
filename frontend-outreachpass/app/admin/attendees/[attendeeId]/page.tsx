"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Attendee } from '@/types';
import { CardAnalyticsResponse } from '@/types/analytics';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Linkedin,
  QrCode,
  Download,
  Send,
  Edit,
  Trash2,
  Eye,
  Smartphone,
  Chrome,
  Monitor,
  Clock,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

export default function AttendeeDetailPage() {
  const params = useParams();
  const attendeeId = params?.attendeeId as string;
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: attendee, isLoading } = useQuery<Attendee>({
    queryKey: ['attendee', attendeeId],
    queryFn: async () => await apiClient.get<Attendee>(`/admin/attendees/${attendeeId}`),
    enabled: !!attendeeId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch card analytics if card_id exists
  const { data: analytics } = useQuery<CardAnalyticsResponse | null>({
    queryKey: ['card-analytics', attendee?.card_id],
    queryFn: async () => {
      if (!attendee?.card_id) return null;
      return await apiClient.get<CardAnalyticsResponse>(`/api/analytics/cards/${attendee.card_id}?days=365`);
    },
    enabled: !!attendee?.card_id,
    refetchInterval: 30000, // Auto-refresh analytics every 30 seconds
    refetchOnWindowFocus: true,
  });

  const generatePassMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(`/admin/attendees/${attendeeId}/issue`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendee', attendeeId] });
    },
  });

  const deleteAttendeeMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(`/admin/attendees/${attendeeId}`);
    },
    onSuccess: () => {
      window.location.href = '/admin/attendees/';
    },
  });

  const handleGeneratePass = () => {
    generatePassMutation.mutate();
  };

  const handleDelete = () => {
    if (
      window.confirm(
        'Are you sure you want to delete this attendee? This action cannot be undone.'
      )
    ) {
      deleteAttendeeMutation.mutate();
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${attendee?.first_name}-${attendee?.last_name}-qr.png`;
    a.click();
  };

  const sendPass = async () => {
    if (!attendee?.email) return;

    try {
      await apiClient.post(`/admin/attendees/${attendeeId}/send-pass`, {});
      alert('Pass sent successfully!');
    } catch (error) {
      alert('Failed to send pass');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded"></div>
              <div className="h-5 w-48 bg-gray-200 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center">
                      <div className="h-5 w-5 bg-gray-200 rounded-full mr-3"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-24 bg-gray-200 rounded mb-1"></div>
                    <div className="h-8 w-full bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Attendee not found</h2>
        <a
          href="/admin/attendees/"
          className="text-brand-primary hover:underline mt-4 inline-block"
        >
          Back to Attendees
        </a>
      </div>
    );
  }

  const cardUrl = attendee.card_id
    ? `https://app.outreachpass.base2ml.com/card/${attendee.card_id}`
    : '';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <a
          href="/admin/attendees/"
          className="inline-flex items-center text-sm text-brand-primary hover:text-brand-primary/80 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Attendees
        </a>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {attendee.first_name} {attendee.last_name}
            </h1>
            {attendee.title && <p className="mt-1 text-lg text-gray-600">{attendee.title}</p>}
            {attendee.org_name && (
              <p className="mt-1 text-sm text-gray-500">{attendee.org_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/admin/attendees/${attendeeId}/edit/`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
            <dl className="space-y-4">
              {attendee.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={`mailto:${attendee.email}`}
                        className="text-brand-primary hover:underline"
                      >
                        {attendee.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {attendee.phone && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={`tel:${attendee.phone}`}
                        className="text-brand-primary hover:underline"
                      >
                        {attendee.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {attendee.org_name && (
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Organization</dt>
                    <dd className="text-sm text-gray-900">{attendee.org_name}</dd>
                  </div>
                </div>
              )}
              {attendee.linkedin_url && (
                <div className="flex items-center">
                  <Linkedin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={attendee.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline"
                      >
                        View Profile
                      </a>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Pass Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pass Status</h2>
            {attendee.card_id ? (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800 font-medium">Pass Generated</p>
                  <p className="text-xs text-green-700 mt-1">
                    This attendee has an active pass
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQRCode(!showQRCode)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {showQRCode ? 'Hide' : 'Show'} QR Code
                  </button>
                  <button
                    onClick={sendPass}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/5"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Pass
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-800 font-medium">No Pass Generated</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Generate a pass to enable QR code access
                  </p>
                </div>
                <button
                  onClick={handleGeneratePass}
                  disabled={generatePassMutation.isPending}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {generatePassMutation.isPending ? 'Generating...' : 'Generate Pass'}
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity Timeline */}
          {attendee.card_id && analytics?.recent_activity && analytics.recent_activity.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
              <div className="flow-root">
                <ul className="-mb-8">
                  {analytics.recent_activity.map((event: any, eventIdx: number) => (
                    <li key={eventIdx}>
                      <div className="relative pb-8">
                        {eventIdx !== analytics.recent_activity.length - 1 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center ring-4 ring-white">
                              {event.event_name === 'card_viewed' && (
                                <Eye className="h-4 w-4 text-brand-primary" />
                              )}
                              {event.event_name === 'vcard_downloaded' && (
                                <Download className="h-4 w-4 text-blue-600" />
                              )}
                              {(event.event_name === 'apple_wallet_generated' ||
                                event.event_name === 'google_wallet_generated') && (
                                <Smartphone className="h-4 w-4 text-green-600" />
                              )}
                              {event.event_name === 'email_opened' && (
                                <Mail className="h-4 w-4 text-purple-600" />
                              )}
                              {event.event_name === 'email_clicked' && (
                                <Chrome className="h-4 w-4 text-indigo-600" />
                              )}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-900 font-medium">
                                {event.event_name
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </p>
                              {event.device_type && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {event.device_type} · {event.os || 'Unknown OS'} · {event.browser || 'Unknown Browser'}
                                </p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={event.occurred_at}>
                                {new Date(event.occurred_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code Display */}
          {showQRCode && attendee.card_id && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">QR Code</h2>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                  <QRCodeCanvas
                    id="qr-code-canvas"
                    value={cardUrl}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <button
                  onClick={downloadQRCode}
                  className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Scan this code to view the digital business card
                </p>
              </div>
            </div>
          )}

          {/* Activity Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h2>
            {attendee.card_id && analytics ? (
              <dl className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <dt className="text-sm text-gray-600">Card Views</dt>
                  <dd className="text-2xl font-bold text-brand-primary">{analytics.total_views}</dd>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <dt className="text-sm text-gray-600">Contact Downloads</dt>
                  <dd className="text-2xl font-bold text-blue-600">{analytics.total_vcard_downloads}</dd>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <dt className="text-sm text-gray-600">Wallet Adds</dt>
                  <dd className="text-2xl font-bold text-green-600">{analytics.total_wallet_adds}</dd>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <dt className="text-sm text-gray-600">Email Opens</dt>
                  <dd className="text-2xl font-bold text-purple-600">{analytics.total_email_opens}</dd>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <dt className="text-sm text-gray-600">Email Clicks</dt>
                  <dd className="text-2xl font-bold text-indigo-600">{analytics.total_email_clicks}</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-xs text-gray-500 mb-1">First Viewed</dt>
                  <dd className="text-sm text-gray-900">
                    {analytics.first_viewed_at
                      ? new Date(analytics.first_viewed_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'}
                  </dd>
                  <dt className="text-xs text-gray-500 mb-1 mt-3">Last Activity</dt>
                  <dd className="text-sm text-gray-900">
                    {analytics.last_activity_at
                      ? new Date(analytics.last_activity_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Card Views</dt>
                  <dd className="text-2xl font-bold text-gray-900">0</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Contact Downloads</dt>
                  <dd className="text-2xl font-bold text-gray-900">0</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Last Activity</dt>
                  <dd className="text-sm text-gray-900">Never</dd>
                </div>
                {!attendee.card_id && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Generate a pass to start tracking activity
                  </p>
                )}
              </dl>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Attendee ID</dt>
                <dd className="text-xs font-mono text-gray-900 break-all">{attendee.attendee_id}</dd>
              </div>
              {attendee.card_id && (
                <div>
                  <dt className="text-sm text-gray-500">Card ID</dt>
                  <dd className="text-xs font-mono text-gray-900 break-all">{attendee.card_id}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
