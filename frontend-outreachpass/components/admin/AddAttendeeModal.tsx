"use client";

import { useState } from 'react';
import { X, UserPlus, Mail, Phone, Building, Briefcase, Linkedin } from 'lucide-react';

interface AddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (attendeeData: AttendeeFormData) => Promise<void>;
}

export interface AttendeeFormData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  org_name?: string;
  title?: string;
  linkedin_url?: string;
}

export function AddAttendeeModal({ isOpen, onClose, onAdd }: AddAttendeeModalProps) {
  const [formData, setFormData] = useState<AttendeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    org_name: '',
    title: '',
    linkedin_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format if provided
    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address');
        return;
      }
    }

    // Validate LinkedIn URL format if provided
    if (formData.linkedin_url?.trim()) {
      try {
        new URL(formData.linkedin_url.trim());
      } catch {
        setError('Please enter a valid LinkedIn URL');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Filter out empty string values - send only fields with actual content
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value?.trim())
      ) as AttendeeFormData;

      await onAdd(cleanedData);

      // Reset form on success
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        org_name: '',
        title: '',
        linkedin_url: '',
      });
      onClose();
    } catch (err: any) {
      // Handle specific API errors
      if (err.response?.status === 409) {
        setError('An attendee with this email already exists for this event');
      } else if (err.response?.status === 422) {
        setError(err.response?.data?.detail || 'Invalid data provided');
      } else {
        setError(err.message || 'Failed to add attendee. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AttendeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              <UserPlus className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Attendee</h2>
              <p className="text-sm text-gray-500">Add a new attendee manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email <span className="text-xs text-gray-500 font-normal">(recommended)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="john.doe@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for card/vCard generation and portal access
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Organization Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Organization
              </label>
              <input
                type="text"
                value={formData.org_name}
                onChange={(e) => handleChange('org_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Software Engineer"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Add Attendee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
