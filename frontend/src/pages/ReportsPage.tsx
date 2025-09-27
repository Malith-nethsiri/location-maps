import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import ReportsList from '../components/reports/ReportsList';
import ReportBuilder from '../components/reports/ReportBuilder';
import ProfileSetup from '../components/reports/ProfileSetup';
import { reportsApi } from '../services/reportsApi';
import { UserProfile as ReportsUserProfile, ValuationReport } from '../types/reports';
import { UserProfile as AuthUserProfile } from '../contexts/AuthContext';

// Helper function to convert AuthUserProfile to ReportsUserProfile
const convertAuthProfileToReportsProfile = (authProfile: AuthUserProfile | null | undefined, userId: string): ReportsUserProfile | null => {
  if (!authProfile) return null;

  return {
    id: authProfile.id,
    user_id: userId,
    honorable: authProfile.honorable,
    full_name: authProfile.full_name,
    professional_title: authProfile.professional_title,
    qualifications_list: authProfile.qualifications,
    professional_status: authProfile.professional_status,
    house_number: authProfile.house_number,
    street_name: authProfile.street_name,
    area_name: authProfile.area_name,
    city: authProfile.city,
    district: authProfile.district,
    phone_number: authProfile.telephone,
    mobile_number: authProfile.mobile,
    email_address: authProfile.email_address,
    ivsl_registration: authProfile.ivsl_registration
  };
};

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [reports, setReports] = useState<ValuationReport[]>([]);

  // Get authenticated user data directly from AuthContext
  const userId = state.user?.uuid || state.user?.id?.toString() || '';
  const authProfile = state.user?.profile;
  const userProfile = convertAuthProfileToReportsProfile(authProfile, userId);
  const isLoadingProfile = !state.initialized;

  const createNewReport = async (reportData?: any) => {
    // Navigate directly to new report builder with GPS input
    navigate('/reports/new');
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if profile is incomplete
  if (!userProfile?.full_name || userProfile.full_name === 'New User') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto py-8">
          <ProfileSetup
            profile={userProfile}
            onProfileUpdate={() => {
              // Profile updates will be handled by AuthContext refresh
              toast.success('Profile updated successfully');
            }}
            userId={userId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                ← Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Valuation Reports</h1>
                <p className="text-sm text-gray-600">Professional property valuation reports with integrated location intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {userProfile?.honorable} {userProfile?.full_name}
              </span>
              <Link
                to="/reports/profile"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={() => createNewReport()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Reports List (Default) */}
          <Route
            path="/"
            element={
              <ReportsList
                userId={userId}
                onCreateNew={createNewReport}
                onSelectReport={(report) => navigate(`/reports/builder/${report.id}`)}
              />
            }
          />

          {/* Report Builder */}
          <Route
            path="/builder/:reportId"
            element={
              <ReportBuilder
                userProfile={userProfile}
                onReportUpdate={(report) => {
                  // Update reports list if needed
                  console.log('Report updated:', report);
                }}
              />
            }
          />

          {/* Profile Management */}
          <Route
            path="/profile"
            element={
              <ProfileSetup
                profile={userProfile}
                onProfileUpdate={() => {
                  // Profile updates will be handled by AuthContext refresh
                  toast.success('Profile updated successfully');
                }}
                userId={userId}
              />
            }
          />

          {/* New Report with GPS Input */}
          <Route
            path="/new"
            element={
              <ReportBuilder
                userProfile={userProfile}
                isNewReport={true}
                onReportUpdate={(report) => {
                  console.log('New report created:', report);
                  navigate('/reports');
                }}
              />
            }
          />
        </Routes>
      </main>

      {/* Quick Stats Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Professional valuation reports with AI-powered content generation
            </div>
            <div className="flex gap-6">
              <span>Cost per report: ~$0.02</span>
              <span>Time savings: 70%</span>
              <Link to="/reports/analytics" className="text-blue-600 hover:text-blue-800">
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReportsPage;