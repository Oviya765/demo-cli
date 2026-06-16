import api from './api';
import type {
  UserResponseDto,
  AdminCreateUserRequestDto,
  AdminUpdateUserRequestDto,
} from '../models/types';

/**
 * GET /api/v1/admin/users
 * Retrieves all registered users in the system.
 */
export async function getAllUsers(): Promise<UserResponseDto[]> {
  try {
    const response = await api.get<UserResponseDto[]>('/api/v1/admin/users');
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to fetch users list');
  }
}

/**
 * GET /api/v1/admin/users/{userId}
 * Retrieves detailed information of a specific user.
 */
export async function getUserById(userId: number): Promise<UserResponseDto> {
  try {
    const response = await api.get<UserResponseDto>(`/api/v1/admin/users/${userId}`);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to fetch details for user ID ${userId}`);
  }
}

/**
 * POST /api/v1/admin/users
 * Creates a new user in the system (Clinician, Lab Tech, etc.).
 */
export async function createUser(request: AdminCreateUserRequestDto): Promise<UserResponseDto> {
  try {
    const response = await api.post<UserResponseDto>('/api/v1/admin/users', request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Failed to create user');
  }
}

/**
 * PUT /api/v1/admin/users/{userId}
 * Updates an existing user's details.
 */
export async function updateUser(
  userId: number,
  request: AdminUpdateUserRequestDto
): Promise<UserResponseDto> {
  try {
    const response = await api.put<UserResponseDto>(`/api/v1/admin/users/${userId}`, request);
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to update user ID ${userId}`);
  }
}

/**
 * DELETE /api/v1/admin/users/{userId}
 * Deactivates or suspends a user in the system.
 */
export async function deactivateUser(userId: number): Promise<void> {
  try {
    await api.delete(`/api/v1/admin/users/${userId}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || `Failed to deactivate user ID ${userId}`);
  }
}
