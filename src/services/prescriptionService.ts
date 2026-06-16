import type { PrescriptionResponseDto, PrescriptionRequestDto } from '../models/types';

const BASE_URL = 'http://localhost:8081';

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('clinic_flow_user');
    if (stored) {
      const authUser = JSON.parse(stored);
      if (authUser?.token) {
        return {
          'Authorization': `Bearer ${authUser.token}`,
          'Content-Type': 'application/json'
        };
      }
    }
  } catch (err) {
    console.error('Error reading auth token', err);
  }
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * GET /api/v1/prescriptions
 */
export async function getAllPrescriptions(): Promise<PrescriptionResponseDto[]> {
  const response = await fetch(`${BASE_URL}/api/v1/prescriptions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch prescriptions.');
  }
  return response.json();
}

/**
 * GET /api/v1/prescriptions/{rxId}
 */
export async function getPrescriptionById(rxId: number): Promise<PrescriptionResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/prescriptions/${rxId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Prescription #${rxId} not found.`);
  }
  return response.json();
}

/**
 * POST /api/v1/prescriptions
 */
export async function createPrescription(request: PrescriptionRequestDto): Promise<PrescriptionResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/prescriptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create prescription.');
  }
  return response.json();
}

/**
 * PUT /api/v1/prescriptions/{rxId}
 */
export async function updatePrescription(rxId: number, request: PrescriptionRequestDto): Promise<PrescriptionResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/prescriptions/${rxId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to update prescription.');
  }
  return response.json();
}

/**
 * DELETE /api/v1/prescriptions/{rxId}
 */
export async function deletePrescription(rxId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/v1/prescriptions/${rxId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete prescription.');
  }
}

/**
 * GET /api/v1/medications?search={query}
 */
export async function searchMedications(query: string): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/api/v1/medications?search=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch medications.');
  }
  return response.json();
}
