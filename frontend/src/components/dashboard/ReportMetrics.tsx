import React from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface ReportMetricsProps {
  data: {
    reports: {
      total: number;
      draft: number;
      completed: number;
      this_month: number;
    };
    ai_usage: {
      total_requests: number;
      total_cost: number;
      cost_this_month: number;
    };
    activity: {
      last_login: string;
      reports_created_today: number;
      pdf_generations_today: number;
    };
  } | null;
}

export default function ReportMetrics({ data }: ReportMetricsProps) {
  if (!data) return null;

  const completionRate = data.reports.total > 0
    ? (data.reports.completed / data.reports.total) * 100
    : 0;

  const avgAICost = data.ai_usage.total_requests > 0
    ? data.ai_usage.total_cost / data.ai_usage.total_requests
    : 0;

  const metrics = [
    {
      name: 'Report Completion Rate',
      value: `${completionRate.toFixed(1)}%`,
      change: completionRate > 70 ? '+5.2%' : '-2.1%',
      changeType: completionRate > 70 ? 'positive' : 'negative',
      icon: CheckCircleIcon,
      description: 'Percentage of completed reports'
    },
    {
      name: 'Draft Reports',
      value: data.reports.draft.toString(),
      change: data.reports.draft > 5 ? '+3' : '-1',
      changeType: data.reports.draft > 5 ? 'negative' : 'positive',
      icon: ClockIcon,
      description: 'Reports pending completion'
    },
    {
      name: 'PDF Generations Today',
      value: data.activity.pdf_generations_today.toString(),
      change: data.activity.pdf_generations_today > 2 ? '+2' : '0',
      changeType: data.activity.pdf_generations_today > 2 ? 'positive' : 'neutral',
      icon: DocumentDuplicateIcon,
      description: 'PDFs generated today'
    },
    {
      name: 'Avg AI Cost per Request',
      value: `$${avgAICost.toFixed(3)}`,
      change: avgAICost < 0.05 ? '-$0.01' : '+$0.01',
      changeType: avgAICost < 0.05 ? 'positive' : 'negative',
      icon: CpuChipIcon,
      description: 'Average cost per AI enhancement'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
        <p className="text-sm text-gray-500">Key performance indicators for your valuation practice</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className="h-6 w-6 text-gray-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                      <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                    </div>
                  </div>
                  <div className={`flex items-center ${
                    metric.changeType === 'positive'
                      ? 'text-green-600'
                      : metric.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {metric.changeType === 'positive' && <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />}
                    {metric.changeType === 'negative' && <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">{metric.description}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Insights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-blue-900 mb-2">Productivity Insights</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• You've created {data.reports.this_month} reports this month</p>
              <p>• Your completion rate is {completionRate > 70 ? 'excellent' : completionRate > 50 ? 'good' : 'needs improvement'}</p>
              <p>• {data.reports.draft} reports are pending completion</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-green-900 mb-2">AI Usage Summary</h4>
            <div className="space-y-2 text-sm text-green-800">
              <p>• Total AI requests: {data.ai_usage.total_requests}</p>
              <p>• Total cost: ${data.ai_usage.total_cost.toFixed(2)}</p>
              <p>• This month: ${data.ai_usage.cost_this_month.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="mt-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Report Status Distribution</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Completed Reports</span>
                <span>{data.reports.completed} of {data.reports.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Draft Reports</span>
                <span>{data.reports.draft} of {data.reports.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: `${(data.reports.draft / data.reports.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}