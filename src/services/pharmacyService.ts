import api from './api';
import type { DispenseResponseDto } from '../models/types';

/**
 * Extracts the most meaningful error message from an Axios/network error.
 * Spring Boot backends return errors in several shapes:
 *   - { message: "..." }
 *   - { error: "...", message: "...", status: 400 }
 *   - { errors: [{ defaultMessage: "..." }] } (bean validation)
 *   - a plain string body
 */
function extractErrorMessage(err: any, fallback: string): string {
  // No response at all → network/CORS/backend down.
  if (!err?.response) {
    if (err?.message === 'Network Error') {
      return 'Unable to reach server. Please ensure the backend is running on http://localhost:8081.';
    }
    return err?.message || fallback;
  }

  const data = err.response.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const detail = data.errors
        .map((e: any) => e?.defaultMessage || e?.message || e?.field)
        .filter(Boolean)
        .join('; ');
      if (detail) return detail;
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }

  // Fall back to HTTP status info when the body is unhelpful.
  const status = err.response.status;
  const statusText = err.response.statusText;
  if (status) {
    return `${fallback} (HTTP ${status}${statusText ? ` ${statusText}` : ''}).`;
  }

  return fallback;
}

/**
 * GET /api/v1/pharmacist/dispense-records
 */
export async function getAllDispenseRecords(): Promise<DispenseResponseDto[]> {
  try {
    const response = await api.get<DispenseResponseDto[]>('/api/v1/pharmacist/dispense-records');
    return response.data;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err, 'Failed to fetch dispense records'));
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
    // Surface the raw server error to the console to aid debugging.
    console.error('Dispense request failed.', {
      payload: data,
      status: err?.response?.status,
      responseData: err?.response?.data,
    });
    throw new Error(extractErrorMessage(err, 'Failed to dispense prescription'));
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
    throw new Error(extractErrorMessage(err, `Failed to return dispensed items for record #${dispenseId}`));
  }
}
