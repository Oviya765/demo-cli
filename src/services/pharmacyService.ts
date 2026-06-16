import api from './api';
import type { DispenseResponseDto } from '../models/types';

/**
 * GET /api/v1/pharmacist/dispense-records
 */
export async function getAllDispenseRecords(): Promise<DispenseResponseDto[]> {
  try {
    const response = await api.get<DispenseResponseDto[]>('/api/v1/pharmacist/dispense-records');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch dispense records');
  }
}

/**
 * POST /api/v1/pharmacist/dispense
 */
export async function dispensePrescription(data: any): Promise<DispenseResponseDto> {
  try {
    const response = await api.post<DispenseResponseDto>('/api/v1/pharmacist/dispense', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to dispense prescription');
  }
}

/**
 * POST /api/v1/pharmacist/dispense-records/{dispenseId}/return
 */
export async function returnDispense(dispenseId: number, data: any): Promise<DispenseResponseDto> {
  try {
    const response = await api.post<DispenseResponseDto>(`/api/v1/pharmacist/dispense-records/${dispenseId}/return`, data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to return dispensed items for record #${dispenseId}`);
  }
}
