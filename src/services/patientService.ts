import api from './api';
import type { PatientResponseDto, PatientRequestDto } from '../models/types';

/**
 * GET /api/v1/patients
 */
export async function getAllPatients(): Promise<PatientResponseDto[]> {
  try {
    const response = await api.get<PatientResponseDto[]>('/api/v1/patients');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch patients list');
  }
}

/**
 * GET /api/v1/patients/{id}
 */
export async function getPatientById(id: number): Promise<PatientResponseDto> {
  try {
    const response = await api.get<PatientResponseDto>(`/api/v1/patients/${id}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch patient details with id ${id}`);
  }
}

/**
 * GET /api/v1/patients/mrn/{mrn}
 */
export async function getPatientByMrn(mrn: string): Promise<PatientResponseDto> {
  try {
    const response = await api.get<PatientResponseDto>(`/api/v1/patients/mrn/${mrn}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch patient details with MRN ${mrn}`);
  }
}

/**
 * GET /api/v1/patients/me
 * Retrieves current user's active patient profile from backend with cache fallback.
 */
export async function getMyProfile(): Promise<PatientResponseDto | null> {
  try {
    const response = await api.get<PatientResponseDto>('/api/v1/patients/me');
    return response.data;
  } catch (err: any) {
    if ([403, 404].includes(err?.response?.status)) {
      return null;
    }

    throw new Error(err.response?.data?.message || 'Failed to fetch user profile');
  }
}

/**
 * POST /api/v1/patients
 * Registers a new patient. Can be called by Reception, Admin, or Patient (self-registration).
 */
export async function registerPatient(request: PatientRequestDto): Promise<PatientResponseDto> {
  try {
    const response = await api.post<PatientResponseDto>('/api/v1/patients', request);
    return response.data;
  } catch (err: any) {
    // Rethrow the original error (axios error) so callers can inspect `err.response` for details
    throw err;
  }
}

/**
 * PUT /api/v1/patients/{id}
 */
export async function updatePatient(id: number, request: PatientRequestDto): Promise<PatientResponseDto> {
  try {
    const response = await api.put<PatientResponseDto>(`/api/v1/patients/${id}`, request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to update patient profile');
  }
}

/**
 * Search patients by name or MRN (for autocomplete)
 */
export async function searchPatients(query: string): Promise<PatientResponseDto[]> {
  try {
    const patients = await getAllPatients();
    if (!query.trim()) return patients;
    const q = query.toLowerCase();
    return patients.filter(
      p => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)
    );
  } catch (e) {
    console.error('Search patients failed, falling back to empty list', e);
    return [];
  }
}

export async function fetchMrnByPatientId(patientId: number): Promise<string> {
  try {
    const p = await getPatientById(patientId);
    return p.mrn;
  } catch (err: any) {
    console.error('Failed to fetch MRN for patient', patientId, err);
    return `MRN-${patientId}`;
  }
}