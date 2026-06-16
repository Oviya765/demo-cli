import api from './api';
import type { PaymentResponseDto } from '../models/types';

/**
 * GET /api/v1/finance/payments
 */
export async function getAllPayments(): Promise<PaymentResponseDto[]> {
  try {
    const response = await api.get<PaymentResponseDto[]>('/api/v1/finance/payments');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch payments list');
  }
}

/**
 * POST /api/v1/finance/payments/manual
 */
export async function createPayment(data: any): Promise<PaymentResponseDto> {
  try {
    const response = await api.post<PaymentResponseDto>('/api/v1/finance/payments/manual', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to record payment');
  }
}
