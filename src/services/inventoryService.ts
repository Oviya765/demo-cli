import api from './api';
import type { InventoryResponseDto, MedicationResponseDto } from '../models/types';

export interface StockSummaryResponseDto {
  medicationId: number;
  medicationCode: string;
  medicationName: string;
  totalQuantity: number;
  batchCount: number;
  expiryAlert: boolean;
  lowStockAlert: boolean;
}

/**
 * GET /api/v1/medications
 */
export async function getAllMedications(): Promise<MedicationResponseDto[]> {
  try {
    const response = await api.get<MedicationResponseDto[]>('/api/v1/medications');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch medications list');
  }
}

/**
 * POST /api/v1/medications
 */
export async function createMedication(data: any): Promise<MedicationResponseDto> {
  try {
    const response = await api.post<MedicationResponseDto>('/api/v1/medications', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create medication');
  }
}

/**
 * DELETE /api/v1/medications/{medId}
 */
export async function deleteMedication(medId: number): Promise<void> {
  try {
    await api.delete(`/api/v1/medications/${medId}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to delete medication');
  }
}

/**
 * GET /api/v1/pharmacist/inventory
 */
export async function getAllInventory(): Promise<InventoryResponseDto[]> {
  try {
    const response = await api.get<InventoryResponseDto[]>('/api/v1/pharmacist/inventory');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch inventory list');
  }
}

/**
 * GET /api/v1/pharmacist/inventory/summary
 */
export async function getStockSummary(): Promise<StockSummaryResponseDto[]> {
  try {
    const response = await api.get<StockSummaryResponseDto[]>('/api/v1/pharmacist/inventory/summary');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch stock summary');
  }
}

/**
 * GET /api/v1/pharmacist/inventory/low-stock
 */
export async function getLowStock(threshold?: number): Promise<StockSummaryResponseDto[]> {
  try {
    const response = await api.get<StockSummaryResponseDto[]>('/api/v1/pharmacist/inventory/low-stock', {
      params: threshold ? { threshold } : {}
    });
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch low stock list');
  }
}

/**
 * GET /api/v1/pharmacist/inventory/expiring
 */
export async function getExpiringInventory(days?: number): Promise<InventoryResponseDto[]> {
  try {
    const response = await api.get<InventoryResponseDto[]>('/api/v1/pharmacist/inventory/expiring', {
      params: days ? { days } : {}
    });
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch expiring stock list');
  }
}

/**
 * GET /api/v1/pharmacist/inventory/expired
 */
export async function getExpiredInventory(): Promise<InventoryResponseDto[]> {
  try {
    const response = await api.get<InventoryResponseDto[]>('/api/v1/pharmacist/inventory/expired');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch expired stock list');
  }
}

/**
 * POST /api/v1/pharmacist/inventory
 */
export async function createInventoryItem(data: any): Promise<InventoryResponseDto> {
  try {
    const response = await api.post<InventoryResponseDto>('/api/v1/pharmacist/inventory', data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create inventory item');
  }
}

/**
 * PUT /api/v1/pharmacist/inventory/{inventoryId}
 */
export async function updateInventoryItem(inventoryId: number, data: any): Promise<InventoryResponseDto> {
  try {
    const response = await api.put<InventoryResponseDto>(`/api/v1/pharmacist/inventory/${inventoryId}`, data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to update inventory item #${inventoryId}`);
  }
}

/**
 * POST /api/v1/pharmacist/inventory/{inventoryId}/adjust
 */
export async function adjustStock(inventoryId: number, data: any): Promise<InventoryResponseDto> {
  try {
    const response = await api.post<InventoryResponseDto>(`/api/v1/pharmacist/inventory/${inventoryId}/adjust`, data);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to adjust stock for item #${inventoryId}`);
  }
}

/**
 * DELETE /api/v1/pharmacist/inventory/{inventoryId}
 */
export async function deleteInventoryItem(inventoryId: number): Promise<void> {
  try {
    await api.delete(`/api/v1/pharmacist/inventory/${inventoryId}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to delete inventory item #${inventoryId}`);
  }
}
