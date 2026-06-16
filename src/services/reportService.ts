import api from './api';
import type { ReportResponseDto } from '../models/types';

/**
 * GET /api/v1/manager/reports
 */
export async function getAllReports(): Promise<ReportResponseDto[]> {
  try {
    const response = await api.get<ReportResponseDto[]>('/api/v1/manager/reports');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch reports list');
  }
}

/**
 * POST /api/v1/manager/reports
 */
export async function createReport(data: any): Promise<ReportResponseDto> {
  try {
    const response = await api.post<ReportResponseDto>('/api/v1/manager/reports', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to generate report');
  }
}
