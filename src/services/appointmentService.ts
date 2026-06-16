import api from './api';
import type { AppointmentResponseDto, AppointmentRequestDto, UserResponseDto } from '../models/types';

export interface Clinician {
  userId: number;
  name: string;
  department: string;
}

function getApiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
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
