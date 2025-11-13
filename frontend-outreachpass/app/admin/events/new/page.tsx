"use client";

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { CreateEventInput } from '@/types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
// Replaced Link with anchor tags

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<CreateEventInput>>({
    name: '',
    slug: '',
    starts_at: '',
    ends_at: '',
    timezone: 'America/New_York',
    brand_id: '',
    settings_json: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch brands and set default brand
  const { data: brands } = useQuery<Array<{brand_id: string, display_name: string}>>({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await apiClient.get<Array<{brand_id: string, display_name: string}>>('/admin/brands');
      return response;
    },
  });

  // Set default brand when brands are loaded
  useEffect(() => {
    if (brands && brands.length > 0 && !formData.brand_id) {
      setFormData(prev => ({ ...prev, brand_id: brands[0].brand_id }));
    }
  }, [brands, formData.brand_id]);

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      return await apiClient.post<any>('/admin/events', data);
    },
    onSuccess: () => {
      router.push('/admin/events/');
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to create event' });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Event name is required';
    if (!formData.slug) newErrors.slug = 'Slug is required';
    if (!formData.starts_at) newErrors.starts_at = 'Start date is required';
    if (!formData.ends_at) newErrors.ends_at = 'End date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!formData.brand_id) {
      setErrors({ submit: 'Brand not loaded. Please refresh the page.' });
      return;
    }

    createEventMutation.mutate(formData as CreateEventInput);
  };

  const handleChange = (field: keyof CreateEventInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <div>
      <div className="mb-8">
        <a
          href="/admin/events/"
          className="inline-flex items-center text-sm text-brand-primary hover:text-brand-primary/80 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </a>
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="mt-2 text-sm text-gray-600">
          Set up a new networking event for your attendees
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tech Conference 2025"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Event Slug *
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                errors.slug ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="tech-conference-2025"
            />
            {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly identifier (auto-generated from event name)
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="starts_at" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date *
              </label>
              <input
                type="datetime-local"
                id="starts_at"
                value={formData.starts_at}
                onChange={(e) => handleChange('starts_at', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                  errors.starts_at ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.starts_at && <p className="mt-1 text-sm text-red-600">{errors.starts_at}</p>}
            </div>

            <div>
              <label htmlFor="ends_at" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                End Date *
              </label>
              <input
                type="datetime-local"
                id="ends_at"
                value={formData.ends_at}
                onChange={(e) => handleChange('ends_at', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                  errors.ends_at ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.ends_at && <p className="mt-1 text-sm text-red-600">{errors.ends_at}</p>}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" />
              Timezone
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <a
              href="/admin/events/"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={createEventMutation.isPending}
              className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
