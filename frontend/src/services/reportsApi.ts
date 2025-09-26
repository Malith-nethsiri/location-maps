import {
  UserProfile,
  ValuationReport,
  ReportTemplate,
  SriLankanLocation,
  AIContentRequest,
  AIContentResponse,
  CostAnalytics,
  ReportValidation
} from '../types/reports';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ReportsAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api/reports${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }

    return data.data;
  }

  // ===============================================
  // User Profile Management
  // ===============================================

  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/profile/${userId}`);
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>(`/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // ===============================================
  // Report Management
  // ===============================================

  async createReport(reportData: {
    user_id: string;
    report_type?: string;
    coordinates?: { latitude: number; longitude: number };
    valuation_purpose?: string;
  }): Promise<ValuationReport> {
    return this.request<ValuationReport>('/create', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  async getReport(reportId: number): Promise<ValuationReport> {
    return this.request<ValuationReport>(`/${reportId}`);
  }

  async getUserReports(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    reports: ValuationReport[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (options.status) queryParams.append('status', options.status);
    if (options.limit) queryParams.append('limit', options.limit.toString());
    if (options.offset) queryParams.append('offset', options.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = `/user/${userId}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(`${API_BASE_URL}/api/reports${endpoint}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch reports');
    }

    return {
      reports: data.data,
      pagination: data.pagination
    };
  }

  async updateReportSection(
    reportId: number,
    section: string,
    data: Record<string, any>
  ): Promise<ValuationReport> {
    return this.request<ValuationReport>(`/${reportId}/section`, {
      method: 'PUT',
      body: JSON.stringify({ section, data }),
    });
  }

  async updateReportStatus(
    reportId: number,
    status: 'draft' | 'in_progress' | 'completed' | 'finalized'
  ): Promise<ValuationReport> {
    return this.request<ValuationReport>(`/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteReport(reportId: number): Promise<void> {
    await this.request(`/${reportId}`, {
      method: 'DELETE',
    });
  }

  // ===============================================
  // AI Content Generation
  // ===============================================

  async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
    return this.request<AIContentResponse>('/generate-content', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async enhanceReportSections(
    reportId: number,
    sections: string[]
  ): Promise<Array<{
    section: string;
    generated_text?: string;
    cost_usd: number;
    cached: boolean;
    error?: string;
  }>> {
    return this.request<Array<{
      section: string;
      generated_text?: string;
      cost_usd: number;
      cached: boolean;
      error?: string;
    }>>(`/${reportId}/enhance`, {
      method: 'POST',
      body: JSON.stringify({ sections }),
    });
  }

  // ===============================================
  // PDF Generation
  // ===============================================

  async generateReportPreview(reportId: number, format: 'pdf' | 'html' = 'pdf'): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/api/reports/${reportId}/preview?format=${format}`
    );

    if (!response.ok) {
      throw new Error(`Failed to generate preview: ${response.statusText}`);
    }

    return response.blob();
  }

  async finalizeReport(reportId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to finalize report');
    }

    return response.blob();
  }

  async downloadReport(reportId: number, filename?: string): Promise<void> {
    try {
      const blob = await this.finalizeReport(reportId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `valuation-report-${reportId}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  // ===============================================
  // Templates and Reference Data
  // ===============================================

  async getTemplates(category: string): Promise<ReportTemplate[]> {
    return this.request<ReportTemplate[]>(`/templates/${category}`);
  }

  async getSriLankanLocations(
    type?: string,
    parent?: string
  ): Promise<SriLankanLocation[]> {
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);
    if (parent) queryParams.append('parent', parent);

    const queryString = queryParams.toString();
    const endpoint = `/reference/sri-lankan-locations${queryString ? `?${queryString}` : ''}`;

    return this.request<SriLankanLocation[]>(endpoint);
  }

  // ===============================================
  // Validation
  // ===============================================

  async validateReport(reportId: number): Promise<ReportValidation> {
    // This would be implemented as a separate endpoint or as part of the finalize process
    // For now, we'll do basic client-side validation
    const report = await this.getReport(reportId);

    const errors: Array<{ field: string; message: string; section: string }> = [];
    const warnings: Array<{ field: string; message: string; section: string }> = [];

    // Required fields validation
    if (!report.instruction_source) {
      errors.push({
        field: 'instruction_source',
        message: 'Client information is required',
        section: 'Basic Information'
      });
    }

    if (!report.lot_number) {
      errors.push({
        field: 'lot_number',
        message: 'Lot number is required',
        section: 'Property Identification'
      });
    }

    if (!report.plan_number) {
      errors.push({
        field: 'plan_number',
        message: 'Plan number is required',
        section: 'Property Identification'
      });
    }

    if (!report.market_value) {
      errors.push({
        field: 'market_value',
        message: 'Market value is required',
        section: 'Valuation'
      });
    }

    // Business logic validations
    if (report.building_age && report.building_age > 200) {
      warnings.push({
        field: 'building_age',
        message: 'Building age seems unusually high',
        section: 'Building Description'
      });
    }

    // Calculate completeness score
    const totalFields = 50; // Approximate number of important fields
    const completedFields = Object.values(report).filter(value =>
      value !== null && value !== undefined && value !== ''
    ).length;
    const completeness_score = Math.round((completedFields / totalFields) * 100);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness_score
    };
  }

  // ===============================================
  // Analytics and Cost Tracking
  // ===============================================

  async getCostAnalytics(
    userId: string,
    dateRange?: { start_date?: string; end_date?: string }
  ): Promise<CostAnalytics> {
    const queryParams = new URLSearchParams();
    if (dateRange?.start_date) queryParams.append('start_date', dateRange.start_date);
    if (dateRange?.end_date) queryParams.append('end_date', dateRange.end_date);

    const queryString = queryParams.toString();
    const endpoint = `/analytics/costs/${userId}${queryString ? `?${queryString}` : ''}`;

    return this.request<CostAnalytics>(endpoint);
  }

  // ===============================================
  // Image Management
  // ===============================================

  async uploadImages(
    reportId: number,
    files: FileList,
    category: string
  ): Promise<{ success: boolean; uploaded_count: number }> {
    // This would be implemented with proper file upload handling
    // For now, return a placeholder
    return Promise.resolve({
      success: true,
      uploaded_count: files.length
    });
  }

  // ===============================================
  // Integration with Location Analysis
  // ===============================================

  async createReportFromLocation(locationData: any): Promise<ValuationReport> {
    return this.createReport({
      user_id: locationData.user_id,
      report_type: 'fair_value',
      coordinates: locationData.coordinates,
      valuation_purpose: 'Property assessment based on location analysis'
    });
  }

  // ===============================================
  // Utility Methods
  // ===============================================

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        return { success: true, message: 'API connection successful' };
      } else {
        return { success: false, message: 'API connection failed' };
      }
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  }

  // Format currency for Sri Lankan context
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Convert numbers to words for legal documents
  numberToWords(num: number): string {
    // Simplified implementation - in production would use a proper library
    if (num === 0) return 'Zero';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];
    const teens = [
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
      'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];

    const convert = (n: number): string => {
      if (n >= 1000000) {
        return convert(Math.floor(n / 1000000)) + ' Million ' + convert(n % 1000000);
      }
      if (n >= 1000) {
        return convert(Math.floor(n / 1000)) + ' Thousand ' + convert(n % 1000);
      }
      if (n >= 100) {
        return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
      }
      if (n >= 20) {
        return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
      }
      if (n >= 10) {
        return teens[n - 10];
      }
      return ones[n];
    };

    return convert(num).trim();
  }
}

export const reportsApi = new ReportsAPI();