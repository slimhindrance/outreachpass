"use client";

import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVImportProps {
  onImport: (file: File) => Promise<{ imported: number; errors?: string[] }>;
  templateColumns?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function CSVImport({ onImport, templateColumns, isOpen, onClose }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setResult({
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    if (!templateColumns) return;

    const csvContent = templateColumns.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendees_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Attendees from CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Template Download */}
          {templateColumns && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                Download the CSV template to ensure your file has the correct format
              </p>
              <button
                onClick={downloadTemplate}
                className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium"
              >
                Download Template
              </button>
            </div>
          )}

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-brand-primary hover:text-brand-primary/80 font-medium"
            >
              Choose CSV file
            </label>
            <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
            {file && (
              <p className="text-sm text-gray-700 mt-4 font-medium">{file.name}</p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 ${
              result.errors && result.errors.length > 0
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start">
                {result.errors && result.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    result.errors && result.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {result.imported} attendees imported successfully
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-yellow-700 font-medium">Errors:</p>
                      <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                        {result.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>... and {result.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
