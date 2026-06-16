import api from './api';
import type { PatientResponseDto, PatientRequestDto } from '../models/types';

const LEGACY_PATIENT_CACHE_KEY = 'clinic_flow_patient';

interface StoredAuthIdentity {
  userId?: number;
  email?: string;
}

function getStoredAuthIdentity(): StoredAuthIdentity | null {
  try {
    const raw = localStorage.getItem('clinic_flow_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthIdentity;
    return parsed;
  } catch {
    return null;
  }
}

function getPatientCacheKey(identity?: StoredAuthIdentity | null): string {
  if (identity?.userId != null) {
    return `clinic_flow_patient_user_${identity.userId}`;
  }
  if (identity?.email) {
    return `clinic_flow_patient_email_${identity.email.toLowerCase()}`;
  }
  return LEGACY_PATIENT_CACHE_KEY;
}

function extractEmailFromContact(contactInfoJson?: string): string {
  if (!contactInfoJson) return '';
  try {
    const parsed = JSON.parse(contactInfoJson) as { email?: string };
    return (parsed.email || '').toLowerCase().trim();
  } catch {
    return '';
  }
}

export function getCachedPatientProfile(): PatientResponseDto | null {
  try {
    const identity = getStoredAuthIdentity();
    const scopedKey = getPatientCacheKey(identity);
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw) {
      return JSON.parse(scopedRaw) as PatientResponseDto;
    }

    const legacyRaw = localStorage.getItem(LEGACY_PATIENT_CACHE_KEY);
    if (legacyRaw) {
      const legacyProfile = JSON.parse(legacyRaw) as PatientResponseDto;

      // Prevent cross-user leakage from old shared cache key.
      if (identity?.email) {
        const legacyEmail = extractEmailFromContact(legacyProfile.contactInfoJson);
        if (legacyEmail && legacyEmail === identity.email.toLowerCase().trim()) {
          // Migrate matching legacy cache into scoped key for future reads.
          localStorage.setItem(scopedKey, legacyRaw);
          return legacyProfile;
        }
        return null;
      }

      return legacyProfile;
    }
  } catch {
    return null;
  }
  return null;
}

export function cachePatientProfile(profile: PatientResponseDto): void {
  try {
    const identity = getStoredAuthIdentity();
    const scopedKey = getPatientCacheKey(identity);
    localStorage.setItem(scopedKey, JSON.stringify(profile));

    // Keep legacy cache only when identity is unavailable (backward compatibility).
    if (!identity?.userId && !identity?.email) {
      localStorage.setItem(LEGACY_PATIENT_CACHE_KEY, JSON.stringify(profile));
    }
  } catch {
    // no-op (storage may be unavailable)
  }
}

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
    cachePatientProfile(response.data);
    return response.data;
  } catch (err: any) {
    const cached = getCachedPatientProfile();
    if (cached && cached.status === 'ACTIVE') {
      return cached;
    }

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
    cachePatientProfile(response.data);
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
    cachePatientProfile(response.data);
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

/**
 * Helper to get Patient MRN synchronously by patientId.
 * Used for listing overlays where MRN needs to be printed inline.
 */
export function getPatientMrnSync(patientId: number): string {
  return `MRN-${patientId}`;
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
