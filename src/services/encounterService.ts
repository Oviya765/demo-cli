import type { EncounterResponseDto, EncounterRequestDto } from '../models/types';

const BASE_URL = 'http://localhost:8081';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('clinic_flow_token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * GET /api/v1/clinician/encounters
 */
export async function getAllEncounters(): Promise<EncounterResponseDto[]> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch encounters list.');
  }
  return response.json();
}

/**
 * GET /api/v1/clinician/encounters/{encounterId}
 */
export async function getEncounterById(encounterId: number): Promise<EncounterResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters/${encounterId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Encounter #${encounterId} not found.`);
  }
  return response.json();
}

/**
 * POST /api/v1/clinician/encounters
 */
export async function createEncounter(request: EncounterRequestDto): Promise<EncounterResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create encounter.');
  }
  return response.json();
}

/**
 * PUT /api/v1/clinician/encounters/{encounterId}
 */
export async function updateEncounter(encounterId: number, request: EncounterRequestDto): Promise<EncounterResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters/${encounterId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to update encounter.');
  }
  return response.json();
}

/**
 * PATCH /api/v1/clinician/encounters/status/{encounterId}
 */
export async function completeEncounter(encounterId: number): Promise<EncounterResponseDto> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters/status/${encounterId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to complete encounter.');
  }
  return response.json();
}

/**
 * DELETE /api/v1/clinician/encounters/{encounterId}
 */
export async function deleteEncounter(encounterId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/v1/clinician/encounters/${encounterId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete encounter.');
  }
}
