import api from './api';
import type { InvoiceResponseDto, ServiceItemResponseDto } from '../models/types';

/**
 * GET /api/v1/finance/service-items
 */
export async function getServiceItems(): Promise<ServiceItemResponseDto[]> {
  try {
    const response = await api.get<ServiceItemResponseDto[]>('/api/v1/finance/service-items');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch service items');
  }
}

/**
 * GET /api/v1/finance/invoices
 */
export async function getAllInvoices(): Promise<InvoiceResponseDto[]> {
  try {
    const response = await api.get<InvoiceResponseDto[]>('/api/v1/finance/invoices');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch invoices list');
  }
}

/**
 * POST /api/v1/finance/invoices
 */
export async function createInvoice(data: any): Promise<InvoiceResponseDto> {
  try {
    const response = await api.post<InvoiceResponseDto>('/api/v1/finance/invoices', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create invoice');
  }
}

/**
 * PATCH /api/v1/finance/invoices/{invoiceId}/status/{status}
 */
export async function updateInvoiceStatus(invoiceId: number, status: string): Promise<InvoiceResponseDto> {
  try {
    const response = await api.patch<InvoiceResponseDto>(`/api/v1/finance/invoices/${invoiceId}/status/${status}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to update status for invoice #${invoiceId}`);
  }
}

/**
 * DELETE /api/v1/finance/invoices/{invoiceId}
 */
export async function deleteInvoice(invoiceId: number): Promise<void> {
  try {
    await api.delete(`/api/v1/finance/invoices/${invoiceId}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to delete invoice #${invoiceId}`);
  }
}

/**
 * PUT /api/v1/finance/invoices/{invoiceId}
 */
export async function updateInvoice(invoiceId: number, data: any): Promise<InvoiceResponseDto> {
  try {
    const response = await api.put<InvoiceResponseDto>(`/api/v1/finance/invoices/${invoiceId}`, data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to update invoice');
  }
}