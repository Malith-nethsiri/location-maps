import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ChartBarIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  monthly_reports: Array<{
    month: string;
    count: number;
  }>;
  location_distribution: Array<{
    district: string;
    count: number;
  }>;
  report_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  ai_usage_trend: Array<{
    date: string;
    requests: number;
    cost: number;
  }>;
  value_ranges: Array<{
    range: string;
    count: number;
  }>;
}

interface ReportAnalyticsProps {
  data: any;
}

export default function ReportAnalytics({ data }: ReportAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/reports/analytics?timeframe=${selectedTimeframe}`);
      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Frame Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Analytics Overview</h3>
          <div className="flex space-x-2">
            {(['week', 'month', 'quarter', 'year'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">
              {analyticsData?.monthly_reports?.reduce((sum, item) => sum + item.count, 0) || 0}
            </div>
            <div className="text-sm text-gray-500">Total Reports</div>
          </div>
          <div className="text-center">
            <MapPinIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">
              {analyticsData?.location_distribution?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Districts Covered</div>
          </div>
          <div className="text-center">
            <CurrencyDollarIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">
              ${analyticsData?.ai_usage_trend?.reduce((sum, item) => sum + item.cost, 0).toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-500">AI Costs</div>
          </div>
          <div className="text-center">
            <CalendarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">
              {Math.round((analyticsData?.monthly_reports?.reduce((sum, item) => sum + item.count, 0) || 0) /
                (analyticsData?.monthly_reports?.length || 1))}
            </div>
            <div className="text-sm text-gray-500">Avg per Month</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Reports Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Reports Over Time</h4>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analyticsData?.monthly_reports?.map((item, index) => {
              const maxCount = Math.max(...(analyticsData.monthly_reports?.map(r => r.count) || [1]));
              const height = (item.count / maxCount) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-blue-600 rounded-t w-full min-h-[4px] flex items-end justify-center text-white text-xs"
                    style={{ height: `${height}%` }}
                  >
                    {item.count > 0 && <span className="mb-1">{item.count}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                    {item.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Reports by District</h4>
          <div className="space-y-3">
            {analyticsData?.location_distribution?.slice(0, 8).map((item, index) => {
              const maxCount = Math.max(...(analyticsData.location_distribution?.map(l => l.count) || [1]));
              const percentage = (item.count / maxCount) * 100;
              return (
                <div key={index} className="flex items-center">
                  <div className="w-24 text-sm text-gray-600 truncate">{item.district}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-8 text-sm text-gray-600 text-right">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Types Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Report Types</h4>
          <div className="space-y-4">
            {analyticsData?.report_types?.map((type, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-4 h-4 rounded-full mr-3 ${
                      index === 0 ? 'bg-blue-600' :
                      index === 1 ? 'bg-green-600' :
                      index === 2 ? 'bg-yellow-600' :
                      'bg-purple-600'
                    }`}
                  ></div>
                  <span className="text-sm text-gray-700 capitalize">
                    {type.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{type.percentage.toFixed(1)}%</span>
                  <span className="text-sm font-medium text-gray-900">{type.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value Ranges */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Property Value Distribution</h4>
          <div className="space-y-3">
            {analyticsData?.value_ranges?.map((range, index) => {
              const maxCount = Math.max(...(analyticsData.value_ranges?.map(v => v.count) || [1]));
              const percentage = (range.count / maxCount) * 100;
              return (
                <div key={index} className="flex items-center">
                  <div className="w-32 text-sm text-gray-600">{range.range}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-8 text-sm text-gray-600 text-right">{range.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Usage Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">AI Usage and Cost Trend</h4>
        <div className="h-64 flex items-end justify-between space-x-1">
          {analyticsData?.ai_usage_trend?.map((item, index) => {
            const maxCost = Math.max(...(analyticsData.ai_usage_trend?.map(a => a.cost) || [1]));
            const costHeight = (item.cost / maxCost) * 100;
            const maxRequests = Math.max(...(analyticsData.ai_usage_trend?.map(a => a.requests) || [1]));
            const requestHeight = (item.requests / maxRequests) * 100;

            return (
              <div key={index} className="flex flex-col items-center flex-1 space-y-1">
                <div className="flex items-end space-x-1 h-48">
                  <div
                    className="bg-blue-600 rounded-t w-3 min-h-[2px]"
                    style={{ height: `${requestHeight}%` }}
                    title={`Requests: ${item.requests}`}
                  ></div>
                  <div
                    className="bg-green-600 rounded-t w-3 min-h-[2px]"
                    style={{ height: `${costHeight}%` }}
                    title={`Cost: $${item.cost.toFixed(2)}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 truncate w-full text-center">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600">AI Requests</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Cost ($)</span>
          </div>
        </div>
      </div>
    </div>
  );
}