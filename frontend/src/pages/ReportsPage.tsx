import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ReportsList from '../components/reports/ReportsList';
import ReportBuilder from '../components/reports/ReportBuilder';
import ProfileSetup from '../components/reports/ProfileSetup';
import { reportsApi } from '../services/reportsApi';
import { UserProfile, ValuationReport } from '../types/reports';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [reports, setReports] = useState<ValuationReport[]>([]);

  // Mock user ID - in real app would come from authentication
  const userId = 'user_123';

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await reportsApi.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const createNewReport = async (reportData?: any) => {
    try {
      const newReport = await reportsApi.createReport({
        user_id: userId,
        report_type: reportData?.report_type || 'fair_value',
        coordinates: reportData?.coordinates,
        valuation_purpose: reportData?.valuation_purpose || 'Property assessment for client evaluation'
      });

      toast.success('New report created successfully!');
      navigate(`/reports/builder/${newReport.id}`);
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast.error('Failed to create new report');
    }
  };

  if (isLoadingProfile) {
    return (
      <div className=\"min-h-screen bg-gray-100 flex items-center justify-center\">
        <div className=\"bg-white rounded-lg shadow-md p-8 text-center\">
          <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4\"></div>
          <p className=\"text-gray-600\">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if profile is incomplete
  if (!userProfile?.full_name || userProfile.full_name === 'New User') {
    return (
      <div className=\"min-h-screen bg-gray-100\">
        <div className=\"max-w-4xl mx-auto py-8\">
          <ProfileSetup
            profile={userProfile}
            onProfileUpdate={setUserProfile}
            userId={userId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-100\">
      {/* Header */}
      <header className=\"bg-white shadow-sm border-b\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"flex justify-between items-center py-4\">
            <div className=\"flex items-center gap-8\">
              <Link to=\"/\" className=\"text-blue-600 hover:text-blue-800 font-medium\">
                ← Location Analysis
              </Link>
              <div>
                <h1 className=\"text-2xl font-bold text-gray-900\">Valuation Reports</h1>
                <p className=\"text-sm text-gray-600\">Professional property valuation reports with AI assistance</p>
              </div>
            </div>
            <div className=\"flex items-center gap-4\">
              <span className=\"text-sm text-gray-600\">
                Welcome, {userProfile.honorable} {userProfile.full_name}
              </span>
              <Link
                to=\"/reports/profile\"
                className=\"px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors\"
              >
                Profile
              </Link>
              <button
                onClick={() => createNewReport()}
                className=\"px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors\"
              >
                + New Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        <Routes>
          {/* Reports List (Default) */}
          <Route
            path=\"/\"
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
            path=\"/builder/:reportId\"
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
            path=\"/profile\"
            element={
              <ProfileSetup
                profile={userProfile}
                onProfileUpdate={setUserProfile}
                userId={userId}
              />
            }
          />

          {/* Create from Location Analysis */}
          <Route
            path=\"/create-from-location\"
            element={
              <div className=\"bg-white rounded-lg shadow-md p-6\">
                <h2 className=\"text-lg font-semibold mb-4\">Create Report from Location Analysis</h2>
                <p className=\"text-gray-600 mb-4\">
                  This feature allows you to create a valuation report using data from your recent location analysis.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className=\"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700\"
                >
                  Go to Location Analysis
                </button>
              </div>
            }
          />
        </Routes>
      </main>

      {/* Quick Stats Footer */}
      <footer className=\"bg-white border-t mt-auto\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4\">
          <div className=\"flex justify-between items-center text-sm text-gray-600\">
            <div>
              Professional valuation reports with AI-powered content generation
            </div>
            <div className=\"flex gap-6\">
              <span>Cost per report: ~$0.02</span>
              <span>Time savings: 70%</span>
              <Link to=\"/reports/analytics\" className=\"text-blue-600 hover:text-blue-800\">
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