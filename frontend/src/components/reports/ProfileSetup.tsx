import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { reportsApi } from '../../services/reportsApi';
import { UserProfile } from '../../types/reports';

interface ProfileSetupProps {
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
  userId: string;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ profile, onProfileUpdate, userId }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    honorable: profile?.honorable || 'Mr.',
    full_name: profile?.full_name || '',
    professional_title: profile?.professional_title || 'Chartered Valuation Surveyor',
    qualifications_list: profile?.qualifications_list || ['BSc Surveying'],
    professional_status: profile?.professional_status || 'MRICS',
    house_number: profile?.house_number || '',
    street_name: profile?.street_name || '',
    area_name: profile?.area_name || '',
    city: profile?.city || '',
    district: profile?.district || '',
    phone_number: profile?.phone_number || '',
    mobile_number: profile?.mobile_number || '',
    email_address: profile?.email_address || '',
    ivsl_registration: profile?.ivsl_registration || '',
    default_valuer_reference: profile?.default_valuer_reference || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQualificationChange = (index: number, value: string) => {
    const newQualifications = [...(formData.qualifications_list || [])];
    newQualifications[index] = value;
    setFormData(prev => ({ ...prev, qualifications_list: newQualifications }));
  };

  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications_list: [...(prev.qualifications_list || []), '']
    }));
  };

  const removeQualification = (index: number) => {
    const newQualifications = [...(formData.qualifications_list || [])];
    newQualifications.splice(index, 1);
    setFormData(prev => ({ ...prev, qualifications_list: newQualifications }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email_address) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const updatedProfile = await reportsApi.updateUserProfile(userId, formData);
      onProfileUpdate(updatedProfile);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Profile Setup</h2>
        <p className="text-gray-600">
          This information will be used to auto-fill your valuation reports, saving you time on every report.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <select
                value={formData.honorable}
                onChange={(e) => handleInputChange('honorable', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Title
              </label>
              <input
                type="text"
                value={formData.professional_title}
                onChange={(e) => handleInputChange('professional_title', e.target.value)}
                placeholder="e.g., Chartered Valuation Surveyor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Status
              </label>
              <input
                type="text"
                value={formData.professional_status}
                onChange={(e) => handleInputChange('professional_status', e.target.value)}
                placeholder="e.g., MRICS, FRICS"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Qualifications */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Qualifications
            </label>
            {formData.qualifications_list?.map((qualification, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => handleQualificationChange(index, e.target.value)}
                  placeholder="e.g., BSc Surveying, MSc Valuation"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeQualification(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addQualification}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 text-sm"
            >
              + Add Qualification
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House Number
              </label>
              <input
                type="text"
                value={formData.house_number}
                onChange={(e) => handleInputChange('house_number', e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Name
              </label>
              <input
                type="text"
                value={formData.street_name}
                onChange={(e) => handleInputChange('street_name', e.target.value)}
                placeholder="Main Street"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <input
                type="text"
                value={formData.area_name}
                onChange={(e) => handleInputChange('area_name', e.target.value)}
                placeholder="Colombo 03"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Colombo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                placeholder="Colombo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="+94 11 1234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile *
              </label>
              <input
                type="tel"
                value={formData.mobile_number}
                onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                placeholder="+94 77 1234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVSL Registration Number
              </label>
              <input
                type="text"
                value={formData.ivsl_registration}
                onChange={(e) => handleInputChange('ivsl_registration', e.target.value)}
                placeholder="VS/2024/001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Reference Format
              </label>
              <input
                type="text"
                value={formData.default_valuer_reference}
                onChange={(e) => handleInputChange('default_valuer_reference', e.target.value)}
                placeholder="VR/JS"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used as: {formData.default_valuer_reference || 'VR/JS'}/2024/001
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Why do we need this information?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Auto-fill reports:</strong> This data will automatically populate every valuation report header</li>
          <li>• <strong>Professional appearance:</strong> Ensures consistent, professional formatting</li>
          <li>• <strong>Time savings:</strong> No need to re-enter the same information for each report</li>
          <li>• <strong>Compliance:</strong> Meets Sri Lankan valuation report standards</li>
        </ul>
      </div>
    </div>
  );
};

export default ProfileSetup;