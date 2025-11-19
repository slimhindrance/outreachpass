// React Query hooks for Enhanced Analytics API endpoints
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  EventSummaryResponse,
  TimeSeriesResponse,
  DeviceBreakdownResponse,
  ConversionFunnelResponse,
  TenantSummaryResponse,
  AnalyticsQueryParams,
} from '@/types/analytics';

/**
 * Hook to fetch event analytics summary
 * Endpoint: GET /api/analytics/events/{event_id}/summary
 */
export function useEventSummary(
  eventId: string,
  params: Pick<AnalyticsQueryParams, 'days'> = { days: 30 }
) {
  return useQuery<EventSummaryResponse>({
    queryKey: ['analytics', 'event-summary', eventId, params.days],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        days: params.days?.toString() || '30',
      });
      return await apiClient.get<EventSummaryResponse>(
        `/api/analytics/events/${eventId}/summary?${searchParams}`
      );
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch time-series analytics data
 * Endpoint: GET /api/analytics/events/{event_id}/timeseries
 */
export function useEventTimeSeries(
  eventId: string,
  params: Required<Pick<AnalyticsQueryParams, 'metric' | 'granularity' | 'days'>>
) {
  return useQuery<TimeSeriesResponse>({
    queryKey: ['analytics', 'timeseries', eventId, params.metric, params.granularity, params.days],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        metric: params.metric,
        granularity: params.granularity,
        days: params.days.toString(),
      });
      return await apiClient.get<TimeSeriesResponse>(
        `/api/analytics/events/${eventId}/timeseries?${searchParams}`
      );
    },
    enabled: !!eventId && !!params.metric && !!params.granularity,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch device/OS/browser breakdown
 * Endpoint: GET /api/analytics/events/{event_id}/devices
 */
export function useDeviceBreakdown(
  eventId: string,
  params: Pick<AnalyticsQueryParams, 'days'> = { days: 30 }
) {
  return useQuery<DeviceBreakdownResponse>({
    queryKey: ['analytics', 'devices', eventId, params.days],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        days: params.days?.toString() || '30',
      });
      return await apiClient.get<DeviceBreakdownResponse>(
        `/api/analytics/events/${eventId}/devices?${searchParams}`
      );
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch conversion funnel data
 * Endpoint: GET /api/analytics/events/{event_id}/funnel
 */
export function useConversionFunnel(
  eventId: string,
  params: Pick<AnalyticsQueryParams, 'days'> = { days: 30 }
) {
  return useQuery<ConversionFunnelResponse>({
    queryKey: ['analytics', 'funnel', eventId, params.days],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        days: params.days?.toString() || '30',
      });
      return await apiClient.get<ConversionFunnelResponse>(
        `/api/analytics/events/${eventId}/funnel?${searchParams}`
      );
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch tenant-level analytics summary
 * Endpoint: GET /api/analytics/tenants/{tenant_id}/summary
 */
export function useTenantSummary(
  tenantId: string,
  params: Pick<AnalyticsQueryParams, 'days'> = { days: 30 }
) {
  return useQuery<TenantSummaryResponse>({
    queryKey: ['analytics', 'tenant-summary', tenantId, params.days],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        days: params.days?.toString() || '30',
      });
      return await apiClient.get<TenantSummaryResponse>(
        `/api/analytics/tenants/${tenantId}/summary?${searchParams}`
      );
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
