import type {
  AuthenticationRequest,
  RegisterRequest,
  AuthenticationResponse,
  UserRole,
  UserResponseDto
} from '../models/types';
import api from './api';

// Helper to decode JWT claims in client side
export function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode JWT token', err);
    return null;
  }
}

/**
 * POST /api/v1/auth/authenticate
 */
export async function login(request: AuthenticationRequest): Promise<
  AuthenticationResponse & { user: { userId: number; name: string; email: string; role: UserRole; needsPasswordChange?: boolean } }
> {
  try {
    const response = await api.post<AuthenticationResponse>('/api/v1/auth/authenticate', request);
    const data = response.data;
    const decoded = decodeJwt(data.token);
  
    if (!decoded) {
      throw new Error('Failed to resolve authenticated session claims.');
    }

    return {
      token: data.token,
      message: data.message || 'Login successful',
      user: {
        userId: decoded.userId,
        name: decoded.name,
        email: decoded.sub,
        role: decoded.role as UserRole,
        needsPasswordChange: decoded.needsPasswordChange,
      },
    };
  } catch (err: any) {
    if (!err?.response) {
      throw new Error('Unable to reach server. Please start backend on http://localhost:8081 and try again.');
    }
    const serverMessage = err?.response?.data?.message || err?.response?.data;
    throw new Error(serverMessage || 'Authentication failed. Please verify your credentials.');
  }
}

/**
 * POST /api/v1/auth/register
 */
export async function register(request: RegisterRequest): Promise<AuthenticationResponse> {
  try {
    const response = await api.post<AuthenticationResponse>('/api/v1/auth/register', request);
    return response.data;
  } catch (err: any) {
    if (!err?.response) {
      throw new Error('Unable to reach server. Please start backend on http://localhost:8081 and try again.');
    }
    const serverMessage = err?.response?.data?.message || err?.response?.data;
    throw new Error(serverMessage || 'Registration failed.');
  }
}

export async function getCurrentUserProfile(): Promise<UserResponseDto> {
  try {
    const response = await api.get<UserResponseDto>('/api/v1/auth/me');
    return response.data;
  } catch (err: any) {
    if (!err?.response) {
      throw new Error('Unable to reach server. Please start backend on http://localhost:8081 and try again.');
    }
    const serverMessage = err?.response?.data?.message || err?.response?.data;
    throw new Error(serverMessage || 'Failed to fetch current user profile.');
  }
}

/**
 * PUT /api/v1/auth/change-password
 */
export async function changePassword(newPassword: string): Promise<AuthenticationResponse> {
  try {
    if (newPassword === 'clinic@123') {
      throw new Error('Password cannot be the default clinic@123 password.');
    }
    const response = await api.put<AuthenticationResponse>('/api/v1/auth/change-password', { newPassword });
    return response.data;
  } catch (err: any) {
    const serverMessage = err?.response?.data?.message || err?.response?.data || err.message;
    throw new Error(serverMessage || 'Failed to update password.');
  }
}
