import api from './api';
import type {
  LabOrderResponseDto,
  LabResultResponseDto,
  LabResultFlag
} from '../models/types';

export interface LabOrderRequestDto {
  encounterId: number;
  testsJson: string; // JSON string representing array of tests, e.g. '["CBC", "CRP"]'
  sampleId?: string;
  collectedAt?: string;
}

export interface LabResultRequestDto {
  labOrderId: number;
  testCode: string;
  value: string;
  units?: string;
  referenceRangeJson?: string; // JSON string representing e.g. '{"min":"4.0","max":"11.0"}'
  flag?: LabResultFlag;
  reportedAt?: string;
}

export async function getAllOrders(): Promise<LabOrderResponseDto[]> {
  try {
    const response = await api.get<LabOrderResponseDto[]>('/api/v1/lab/orders');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch lab orders');
  }
}

export async function getOrderById(id: number): Promise<LabOrderResponseDto> {
  try {
    const response = await api.get<LabOrderResponseDto>(`/api/v1/lab/orders/${id}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch lab order details with id ${id}`);
  }
}

export async function getOrdersByPatientId(patientId: number): Promise<LabOrderResponseDto[]> {
  try {
    const response = await api.get<LabOrderResponseDto[]>(`/api/v1/lab/orders/patient/${patientId}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch lab orders for patient id ${patientId}`);
  }
}

export async function createLabOrder(request: LabOrderRequestDto): Promise<LabOrderResponseDto> {
  try {
    const response = await api.post<LabOrderResponseDto>('/api/v1/lab/orders', request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create lab order');
  }
}

export async function updateLabOrder(id: number, request: LabOrderRequestDto): Promise<LabOrderResponseDto> {
  try {
    const response = await api.put<LabOrderResponseDto>(`/api/v1/lab/orders/${id}`, request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to update lab order with id ${id}`);
  }
}

export async function cancelLabOrder(id: number): Promise<LabOrderResponseDto> {
  try {
    const response = await api.delete<LabOrderResponseDto>(`/api/v1/lab/orders/${id}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to cancel lab order with id ${id}`);
  }
}

export async function collectSample(id: number): Promise<LabOrderResponseDto> {
  try {
    const response = await api.patch<LabOrderResponseDto>(`/api/v1/lab/orders/${id}/collect`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to collect sample for lab order with id ${id}`);
  }
}

export async function getAllResults(): Promise<LabResultResponseDto[]> {
  try {
    const response = await api.get<LabResultResponseDto[]>('/api/v1/lab/results');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch lab results');
  }
}

export async function getResultById(id: number): Promise<LabResultResponseDto> {
  try {
    const response = await api.get<LabResultResponseDto>(`/api/v1/lab/results/${id}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch lab result with id ${id}`);
  }
}

export async function getResultsByOrderId(orderId: number): Promise<LabResultResponseDto[]> {
  try {
    const response = await api.get<LabResultResponseDto[]>(`/api/v1/lab/orders/${orderId}/results`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch results for lab order id ${orderId}`);
  }
}

export async function createLabResult(request: LabResultRequestDto): Promise<LabResultResponseDto> {
  try {
    const response = await api.post<LabResultResponseDto>('/api/v1/lab/results', request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create lab result');
  }
}

export async function updateLabResult(id: number, request: LabResultRequestDto): Promise<LabResultResponseDto> {
  try {
    const response = await api.put<LabResultResponseDto>(`/api/v1/lab/results/${id}`, request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to update lab result with id ${id}`);
  }
}

export async function deleteLabResult(id: number): Promise<void> {
  try {
    await api.delete(`/api/v1/lab/results/${id}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to delete lab result with id ${id}`);
  }
}