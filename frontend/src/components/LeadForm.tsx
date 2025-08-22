// File: frontend/src/components/LeadForm.tsx - FIXED VERSION

import React, { useState, useEffect } from 'react';

interface LeadFormProps {
  onSubmit: (formData: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any; // Added this prop to fix the TypeScript error
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  interests: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  notes: string;
}

const LeadForm: React.FC<LeadFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    interests: [],
    urgencyLevel: 'medium',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form with initial data when available
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        notes: initialData.lastMessage || '',
        interests: initialData.inferredInterests || [],
        urgencyLevel: initialData.urgencyLevel || 'medium'
      }));
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const availableInterests = [
    'auto_insurance',
    'health_insurance',
    'life_insurance',
    'business_insurance',
    'property_insurance',
    'general_inquiry'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your email address"
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Phone Field */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your phone number"
          disabled={isSubmitting}
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Areas of Interest
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableInterests.map((interest) => (
            <label key={interest} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestToggle(interest)}
                className="mr-2"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700 capitalize">
                {interest.replace(/_/g, ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Urgency Level */}
      <div>
        <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
          Urgency Level
        </label>
        <select
          id="urgency"
          value={formData.urgencyLevel}
          onChange={(e) => handleInputChange('urgencyLevel', e.target.value as 'high' | 'medium' | 'low')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          <option value="low">Low - Just browsing</option>
          <option value="medium">Medium - Interested</option>
          <option value="high">High - Need quote soon</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional information or specific requirements..."
          disabled={isSubmitting}
        />
      </div>

      {/* Chat Context Display (if available) */}
      {initialData && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Chat Context</h4>
          <p className="text-xs text-gray-600">
            <strong>Last Message:</strong> {initialData.lastMessage}
          </p>
          {initialData.aiResponse && (
            <p className="text-xs text-gray-600 mt-1">
              <strong>AI Response:</strong> {initialData.aiResponse.substring(0, 100)}...
            </p>
          )}
          {initialData.confidence && (
            <p className="text-xs text-gray-600 mt-1">
              <strong>Confidence:</strong> {Math.round(initialData.confidence * 100)}%
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Capture Lead'}
        </button>
      </div>
    </form>
  );
};

export default LeadForm;