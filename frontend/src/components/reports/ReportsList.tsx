import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportsApi } from '../../services/reportsApi';
import { ValuationReport } from '../../types/reports';

interface ReportsListProps {
  userId: string;
  onCreateNew: (data?: any) => void;
  onSelectReport: (report: ValuationReport) => void;
}

const ReportsList: React.FC<ReportsListProps> = ({ userId, onCreateNew, onSelectReport }) => {
  const [reports, setReports] = useState<ValuationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  useEffect(() => {
    loadReports();
  }, [statusFilter, pagination.offset]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const result = await reportsApi.getUserReports(userId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: pagination.limit,
        offset: pagination.offset
      });

      setReports(result.reports);
      setPagination(result.pagination);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      finalized: 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not valued';
    return reportsApi.formatCurrency(amount);
  };

  const handleDownloadReport = async (report: ValuationReport, event: React.MouseEvent) => {
    event.stopPropagation();

    if (report.status !== 'completed' && report.status !== 'finalized') {
      toast.warning('Report must be completed before downloading');
      return;
    }

    try {
      await reportsApi.downloadReport(report.id, `${report.report_reference}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  if (isLoading && reports.length === 0) {
    return (
      <div className=\"bg-white rounded-lg shadow-md p-8 text-center\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4\"></div>
        <p className=\"text-gray-600\">Loading your reports...</p>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Header with Stats */}
      <div className=\"bg-white rounded-lg shadow-md p-6\">
        <div className=\"flex justify-between items-center mb-6\">
          <div>
            <h2 className=\"text-2xl font-bold text-gray-900\">Your Valuation Reports</h2>
            <p className=\"text-gray-600\">
              {pagination.total} report{pagination.total !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={() => onCreateNew()}
            className=\"px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium\"
          >
            + Create New Report
          </button>
        </div>

        {/* Quick Stats */}
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mb-6\">
          <div className=\"bg-gray-50 rounded-lg p-4\">
            <div className=\"text-2xl font-bold text-gray-900\">
              {reports.filter(r => r.status === 'draft').length}
            </div>
            <div className=\"text-sm text-gray-600\">Draft</div>
          </div>
          <div className=\"bg-blue-50 rounded-lg p-4\">
            <div className=\"text-2xl font-bold text-blue-600\">
              {reports.filter(r => r.status === 'in_progress').length}
            </div>
            <div className=\"text-sm text-gray-600\">In Progress</div>
          </div>
          <div className=\"bg-green-50 rounded-lg p-4\">
            <div className=\"text-2xl font-bold text-green-600\">
              {reports.filter(r => r.status === 'completed').length}
            </div>
            <div className=\"text-sm text-gray-600\">Completed</div>
          </div>
          <div className=\"bg-purple-50 rounded-lg p-4\">
            <div className=\"text-2xl font-bold text-purple-600\">
              {reports.filter(r => r.status === 'finalized').length}
            </div>
            <div className=\"text-sm text-gray-600\">Finalized</div>
          </div>
        </div>

        {/* Filters */}
        <div className=\"flex gap-4 items-center\">
          <label className=\"text-sm font-medium text-gray-700\">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className=\"px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
          >
            <option value=\"all\">All Status</option>
            <option value=\"draft\">Draft</option>
            <option value=\"in_progress\">In Progress</option>
            <option value=\"completed\">Completed</option>
            <option value=\"finalized\">Finalized</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className=\"bg-white rounded-lg shadow-md p-8 text-center\">
          <div className=\"text-gray-400 mb-4\">
            <svg className=\"mx-auto h-12 w-12\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2}
                d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\" />
            </svg>
          </div>
          <h3 className=\"text-lg font-medium text-gray-900 mb-2\">No reports found</h3>
          <p className=\"text-gray-600 mb-6\">
            {statusFilter === 'all'
              ? \"You haven't created any valuation reports yet.\"
              : `No reports with status \"${statusFilter}\" found.`
            }
          </p>
          <div className=\"space-y-3\">
            <button
              onClick={() => onCreateNew()}
              className=\"px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors\"
            >
              Create Your First Report
            </button>
            <div className=\"text-sm text-gray-500\">
              Or start with{' '}
              <Link to=\"/\" className=\"text-blue-600 hover:text-blue-800\">
                location analysis
              </Link>{' '}
              to auto-fill property details
            </div>
          </div>
        </div>
      ) : (
        <div className=\"space-y-4\">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => onSelectReport(report)}
              className=\"bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow\"
            >
              <div className=\"flex justify-between items-start mb-4\">
                <div className=\"flex-1\">
                  <div className=\"flex items-center gap-3 mb-2\">
                    <h3 className=\"text-lg font-semibold text-gray-900\">
                      {report.report_reference || `Report #${report.id}`}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                      {report.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {report.report_type && (
                      <span className=\"px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md\">
                        {report.report_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className=\"text-gray-600 mb-2\">
                    {report.location_summary || report.valuation_purpose || 'Property valuation report'}
                  </p>
                  <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600\">
                    <div>
                      <span className=\"font-medium\">Created:</span>
                      <br />
                      {formatDate(report.created_at)}
                    </div>
                    <div>
                      <span className=\"font-medium\">Report Date:</span>
                      <br />
                      {formatDate(report.report_date)}
                    </div>
                    <div>
                      <span className=\"font-medium\">Market Value:</span>
                      <br />
                      {formatCurrency(report.market_value)}
                    </div>
                    <div>
                      <span className=\"font-medium\">Last Updated:</span>
                      <br />
                      {formatDate(report.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className=\"flex gap-2 ml-4\">
                  {(report.status === 'completed' || report.status === 'finalized') && (
                    <button
                      onClick={(e) => handleDownloadReport(report, e)}
                      className=\"px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm\"
                      title=\"Download PDF\"
                    >
                      <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                        <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2}
                          d=\"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectReport(report);
                    }}
                    className=\"px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm\"
                    title=\"Edit Report\"
                  >
                    <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                      <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2}
                        d=\"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z\" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Indicator */}
              {report.status === 'in_progress' && (
                <div className=\"mt-4\">
                  <div className=\"flex justify-between text-sm text-gray-600 mb-1\">
                    <span>Progress</span>
                    <span>~75% complete</span>
                  </div>
                  <div className=\"w-full bg-gray-200 rounded-full h-2\">
                    <div className=\"bg-blue-600 h-2 rounded-full\" style={{ width: '75%' }}></div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {pagination.hasMore && (
            <div className=\"flex justify-center mt-6\">
              <button
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                disabled={isLoading}
                className=\"px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors\"
              >
                {isLoading ? 'Loading...' : 'Load More Reports'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className=\"bg-blue-50 rounded-lg p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Quick Actions</h3>
        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
          <button
            onClick={() => onCreateNew()}
            className=\"p-4 bg-white rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors text-center\"
          >
            <div className=\"text-blue-600 mb-2\">
              <svg className=\"mx-auto h-8 w-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 4v16m8-8H4\" />
              </svg>
            </div>
            <div className=\"font-medium text-gray-900\">Create New Report</div>
            <div className=\"text-sm text-gray-600\">Start fresh with blank report</div>
          </button>

          <Link
            to=\"/\"
            className=\"p-4 bg-white rounded-lg border-2 border-dashed border-green-300 hover:border-green-400 transition-colors text-center\"
          >
            <div className=\"text-green-600 mb-2\">
              <svg className=\"mx-auto h-8 w-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2}
                  d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\" />
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 11a3 3 0 11-6 0 3 3 0 016 0z\" />
              </svg>
            </div>
            <div className=\"font-medium text-gray-900\">Location Analysis</div>
            <div className=\"text-sm text-gray-600\">Analyze location first, then create report</div>
          </Link>

          <Link
            to=\"/reports/profile\"
            className=\"p-4 bg-white rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-400 transition-colors text-center\"
          >
            <div className=\"text-purple-600 mb-2\">
              <svg className=\"mx-auto h-8 w-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2}
                  d=\"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\" />
              </svg>
            </div>
            <div className=\"font-medium text-gray-900\">Update Profile</div>
            <div className=\"text-sm text-gray-600\">Manage auto-fill data</div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReportsList;