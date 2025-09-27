import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  DocumentTextIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface Report {
  id: number;
  report_reference: string;
  status: 'draft' | 'completed' | 'archived';
  instruction_source: string;
  valuation_purpose: string;
  village_name: string;
  district: string;
  province: string;
  market_value: number;
  created_at: string;
  updated_at: string;
  completion_percentage: number;
}

interface ReportListState {
  reports: Report[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: string;
  districtFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  totalPages: number;
  totalReports: number;
}

export default function ReportList() {
  const [state, setState] = useState<ReportListState>({
    reports: [],
    loading: true,
    error: null,
    searchTerm: '',
    statusFilter: 'all',
    districtFilter: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    currentPage: 1,
    totalPages: 1,
    totalReports: 0
  });

  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    fetchReports();
    fetchDistricts();
  }, [state.currentPage, state.statusFilter, state.districtFilter, state.sortBy, state.sortOrder]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (state.currentPage === 1) {
        fetchReports();
      } else {
        setState(prev => ({ ...prev, currentPage: 1 }));
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [state.searchTerm]);

  const fetchReports = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        limit: '10',
        search: state.searchTerm,
        status: state.statusFilter,
        district: state.districtFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      });

      const response = await axios.get(`/reports?${params}`);
      const { reports, pagination } = response.data.data;

      setState(prev => ({
        ...prev,
        reports,
        totalPages: pagination.totalPages,
        totalReports: pagination.total,
        loading: false,
        error: null
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to fetch reports',
        loading: false
      }));
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await axios.get('/reports/districts');
      setDistricts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await axios.delete(`/reports/${reportId}`);
      fetchReports();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleDownloadPDF = async (reportId: number) => {
    try {
      const response = await axios.get(`/reports/${reportId}/pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `valuation-report-${reportId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to download PDF');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">All Reports</h3>
          <p className="text-sm text-gray-500">
            {state.totalReports} total reports
          </p>
        </div>
        <Link
          to="/reports/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <DocumentTextIcon className="h-5 w-5" />
          <span>New Report</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={state.statusFilter}
              onChange={(e) => setState(prev => ({ ...prev, statusFilter: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="relative">
            <MapPinIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={state.districtFilter}
              onChange={(e) => setState(prev => ({ ...prev, districtFilter: e.target.value }))}
            >
              <option value="all">All Districts</option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <CalendarIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={`${state.sortBy}-${state.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setState(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
              }}
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="market_value-desc">Highest Value</option>
              <option value="market_value-asc">Lowest Value</option>
              <option value="village_name-asc">Location A-Z</option>
              <option value="village_name-desc">Location Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {state.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : state.error ? (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium">{state.error}</div>
            <button
              onClick={fetchReports}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : state.reports.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 text-lg">No reports found</div>
            <p className="text-gray-400 mt-2">
              {state.searchTerm || state.statusFilter !== 'all' || state.districtFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first valuation report to get started'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-blue-600">
                            {report.report_reference}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {report.instruction_source}
                          </div>
                          {report.status === 'draft' && (
                            <div className="text-xs text-gray-400 mt-1">
                              {report.completion_percentage}% complete
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{report.village_name}</div>
                        <div className="text-sm text-gray-500">{report.district}, {report.province}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {report.market_value ? formatCurrency(report.market_value) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <Link
                            to={`/reports/${report.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Report"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          {report.status === 'completed' && (
                            <button
                              onClick={() => handleDownloadPDF(report.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Download PDF"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Report"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {state.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((state.currentPage - 1) * 10) + 1} to {Math.min(state.currentPage * 10, state.totalReports)} of {state.totalReports} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={state.currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {state.currentPage} of {state.totalPages}
                  </span>
                  <button
                    onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={state.currentPage === state.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}