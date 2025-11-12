"use client";

import { Settings as SettingsIcon, Building2, Palette, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account and application preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Organization Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-5 w-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Organization</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                defaultValue="Base2ML"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                defaultValue="admin@base2ml.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Palette className="h-5 w-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Branding</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue="#2563EB"
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">#2563EB</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo
              </label>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Upload Logo
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded text-brand-primary mr-3" />
              <span className="text-sm text-gray-700">Email notifications for new attendees</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded text-brand-primary mr-3" />
              <span className="text-sm text-gray-700">Weekly analytics summary</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-brand-primary mr-3" />
              <span className="text-sm text-gray-700">Event reminders</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
