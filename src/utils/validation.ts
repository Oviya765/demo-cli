/**
 * Validates a password against clinic security requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter (A-Z)
 * - Contains at least one lowercase letter (a-z)
 * - Contains at least one numeric digit (0-9)
 * - Contains at least one special character (e.g., !@#$%^&*)
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one numeric digit.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (e.g. @, $, !, %, *).' };
  }
  return { isValid: true };
}
