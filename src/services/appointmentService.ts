import api from './api';
import type { AppointmentResponseDto, AppointmentRequestDto, UserResponseDto } from '../models/types';
import { parseApiError } from '../utils/validation';

export interface Clinician {
  userId: number;
  name: string;
  department: string;
}

function getApiErrorMessage(err: any, fallback: string): string {
  const parsed = parseApiError(err, fallback);
  
  // Check if both startAt and endAt have date validation errors and combine into single message
  const fieldErrors = err?.response?.data?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const hasStartAtError = fieldErrors.startAt?.some((msg: string) => msg.includes('This appointment time window is in the past. Please select a future time window.'));
    const hasEndAtError = fieldErrors.endAt?.some((msg: string) => msg.includes('must be a date in the present or in the futureThis appointment time window is in the past. Please select a future time window.'));
    if (hasStartAtError && hasEndAtError) {
      return 'This appointment time window is in the past. Please select a future time window.';
    }
  }
  
  return parsed;
}

export async function getAllAppointments(): Promise<AppointmentResponseDto[]> {
  try {
    const response = await api.get<AppointmentResponseDto[]>('/api/v1/appointments');
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to fetch appointments'));
  }
}

export async function getAppointmentsByPatient(patientId: number): Promise<AppointmentResponseDto[]> {
  try {
    const response = await api.get<AppointmentResponseDto[]>(`/api/v1/appointments/patient/${patientId}`);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to fetch patient appointments'));
  }
}

export async function createAppointment(request: AppointmentRequestDto): Promise<AppointmentResponseDto> {
  try {
    const response = await api.post<AppointmentResponseDto>('/api/v1/appointments', request);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to create appointment'));
  }
}

export async function checkInAppointment(apptId: number): Promise<AppointmentResponseDto> {
  try {
    const response = await api.patch<AppointmentResponseDto>(`/api/v1/appointments/${apptId}/check-in`);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to check in appointment'));
  }
}

export async function completeAppointment(apptId: number): Promise<AppointmentResponseDto> {
  try {
    const response = await api.patch<AppointmentResponseDto>(`/api/v1/appointments/${apptId}/complete`);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to complete appointment'));
  }
}

export async function cancelAppointment(apptId: number): Promise<AppointmentResponseDto> {
  try {
    const response = await api.patch<AppointmentResponseDto>(`/api/v1/appointments/${apptId}/cancel`);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to cancel appointment'));
  }
}

/**
 * Marks an appointment as NO_SHOW (patient did not arrive).
 */
export async function markNoShow(apptId: number): Promise<AppointmentResponseDto> {
  try {
    const response = await api.patch<AppointmentResponseDto>(`/api/v1/appointments/${apptId}/no-show`);
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to mark appointment as no-show'));
  }
}

/**
 * Reschedules an appointment to a new time window.
 */
export async function rescheduleAppointment(apptId: number, startAt: string, endAt: string): Promise<AppointmentResponseDto> {
  try {
    const response = await api.patch<AppointmentResponseDto>(
      `/api/v1/appointments/${apptId}/reschedule`,
      null,
      { params: { startAt, endAt } }
    );
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to reschedule appointment'));
  }
}

/**
 * Gets clinicians list.
 */
export async function getClinicians(): Promise<Clinician[]> {
  try {
    const response = await api.get<UserResponseDto[]>('/api/v1/appointments/clinicians');
    return response.data.map((u: UserResponseDto) => ({
      userId: u.userId,
      name: u.name,
      department: u.name.includes('Mehta') ? 'General Medicine' : 'Pediatrics'
    }));
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to fetch clinicians list'));
  }
}

/**
 * Gets clinician's booked appointments in a date range for availability checking
 */
export async function getClinicianAppointments(clinicianId: number, from: string, to: string): Promise<AppointmentResponseDto[]> {
  try {
    const response = await api.get<AppointmentResponseDto[]>(`/api/v1/appointments/clinician/${clinicianId}`, {
      params: { from, to }
    });
    return response.data;
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to fetch clinician appointments'));
  }
}
