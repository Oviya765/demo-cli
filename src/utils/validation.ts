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

/**
 * Validates an email address format to ensure:
 * - It contains exactly one '@' symbol
 * - It has a domain name
 * - It ends in a valid TLD dot suffix of at least 2 characters (e.g. .com, .org)
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }
  
  // Checks for: username @ domain . TLD(at least 2 letters)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Please enter a valid email address (e.g., user@example.com).' 
    };
  }
  
  return { isValid: true };
}


export function parseApiError(err: any, fallback = 'Request failed'): string {
  // Network / non-HTTP errors
  const resp = err?.response?.data ?? err;

  if (typeof resp === 'string' && resp.trim()) {
    return resp.trim();
  }

  const messages: string[] = [];

  // 1. Structured field error arrays
  const fieldArrays = [resp?.fieldErrors, resp?.errors].filter(Array.isArray);
  for (const arr of fieldArrays) {
    for (const f of arr) {
      if (typeof f === 'string') {
        messages.push(f);
      } else if (f && (f.field || f.defaultMessage || f.message)) {
        const field = f.field ? `${f.field}: ` : '';
        messages.push(`${field}${f.defaultMessage || f.message || JSON.stringify(f)}`);
      }
    }
  }

  // 2. Spring trace string (MethodArgumentNotValidException, etc.)
  if (messages.length === 0 && typeof resp?.trace === 'string') {
    messages.push(...parseSpringTrace(resp.trace));
  }

  // 3. Single message field
  if (messages.length === 0 && resp?.message) {
    messages.push(String(resp.message));
  }

  // 4. Error object / generic fallback
  if (messages.length === 0 && err?.message) {
    messages.push(String(err.message));
  }

  // De-duplicate while preserving order
  const unique = [...new Set(messages.map(m => m.trim()).filter(Boolean))];

  return unique.length > 0 ? unique.join('\n') : fallback;
}

/**
 * Parses a Spring stack trace string and extracts every field validation error
 * as "field: message" entries.
 */
function parseSpringTrace(trace: string): string[] {
  const results: string[] = [];

  // Each validation failure starts with "Field error in object ..."
  const segments = trace.split('Field error in object');
  for (const seg of segments) {
    const fieldMatch = seg.match(/on field '([^']+)'/);
    if (!fieldMatch) continue;
    // The real validation message is the LAST "default message [...]" in the segment
    const msgMatches = [...seg.matchAll(/default message \[([^\]]*)\]/g)];
    if (msgMatches.length === 0) continue;
    const message = msgMatches[msgMatches.length - 1][1];
    results.push(`${fieldMatch[1]}: ${message}`);
  }

  // Fallback: a single top-level exception message after the exception class name
  if (results.length === 0) {
    const exMatch = trace.match(/Exception:\s*([^\r\n]+)/);
    if (exMatch) {
      results.push(exMatch[1].trim());
    }
  }

  return results;
}

/* ── Vitals Validation ── */

export interface VitalsErrors {
  temp?: string;
  pulse?: string;
  spo2?: string;
  rr?: string;
  weight?: string;
  height?: string;
  bpSystolic?: string;
  bpDiastolic?: string;
}

export interface VitalsWarnings {
  temp?: string;
  pulse?: string;
  spo2?: string;
  rr?: string;
  bpSystolic?: string;
  bpDiastolic?: string;
}

function numOrEmpty(val: string): number | null {
  if (!val.trim()) return null;
  const n = Number(val);
  return isNaN(n) ? NaN : n;
}

export function validateVitals(vitals: {
  temp: string; pulse: string; spo2: string; rr: string;
  weight: string; height: string; bpSystolic: string; bpDiastolic: string;
}): { errors: VitalsErrors; warnings: VitalsWarnings; isValid: boolean } {
  const errors: VitalsErrors = {};
  const warnings: VitalsWarnings = {};

  // Temperature
  const temp = numOrEmpty(vitals.temp);
  if (temp !== null) {
    if (isNaN(temp)) errors.temp = 'Must be a number';
    else if (temp < 30 || temp > 45) errors.temp = 'Range: 30–45 °C';
    else if (temp < 35) warnings.temp = 'Hypothermia (< 35°C)';
    else if (temp > 39.5) warnings.temp = 'High fever (> 39.5°C)';
  }

  // Pulse
  const pulse = numOrEmpty(vitals.pulse);
  if (pulse !== null) {
    if (isNaN(pulse)) errors.pulse = 'Must be a number';
    else if (pulse < 30 || pulse > 250) errors.pulse = 'Range: 30–250 bpm';
    else if (pulse < 60) warnings.pulse = 'Bradycardia (< 60 bpm)';
    else if (pulse > 100) warnings.pulse = 'Tachycardia (> 100 bpm)';
  }

  // SpO2
  const spo2 = numOrEmpty(vitals.spo2);
  if (spo2 !== null) {
    if (isNaN(spo2)) errors.spo2 = 'Must be a number';
    else if (spo2 < 0 || spo2 > 100) errors.spo2 = 'Range: 0–100%';
    else if (spo2 < 90) warnings.spo2 = 'Critical: SpO2 < 90%';
  }

  // Respiratory Rate
  const rr = numOrEmpty(vitals.rr);
  if (rr !== null) {
    if (isNaN(rr)) errors.rr = 'Must be a number';
    else if (rr < 4 || rr > 60) errors.rr = 'Range: 4–60 /min';
    else if (rr < 12) warnings.rr = 'Low resp rate (< 12/min)';
    else if (rr > 20) warnings.rr = 'Elevated resp rate (> 20/min)';
  }

  // Weight
  const weight = numOrEmpty(vitals.weight);
  if (weight !== null) {
    if (isNaN(weight)) errors.weight = 'Must be a number';
    else if (weight < 0.5 || weight > 500) errors.weight = 'Range: 0.5–500 kg';
  }

  // Height
  const height = numOrEmpty(vitals.height);
  if (height !== null) {
    if (isNaN(height)) errors.height = 'Must be a number';
    else if (height < 20 || height > 300) errors.height = 'Range: 20–300 cm';
  }

  // BP Systolic
  const sys = numOrEmpty(vitals.bpSystolic);
  if (sys !== null) {
    if (isNaN(sys)) errors.bpSystolic = 'Must be a number';
    else if (sys < 50 || sys > 300) errors.bpSystolic = 'Range: 50–300 mmHg';
    else if (sys > 140) warnings.bpSystolic = 'Hypertension (> 140 mmHg)';
  }

  // BP Diastolic
  const dia = numOrEmpty(vitals.bpDiastolic);
  if (dia !== null) {
    if (isNaN(dia)) errors.bpDiastolic = 'Must be a number';
    else if (dia < 20 || dia > 200) errors.bpDiastolic = 'Range: 20–200 mmHg';
    else if (dia > 90) warnings.bpDiastolic = 'Elevated diastolic (> 90 mmHg)';
  }

  // Cross-field: diastolic must be < systolic
  if (sys && dia && !isNaN(sys) && !isNaN(dia) && dia >= sys) {
    errors.bpDiastolic = 'Diastolic must be less than systolic';
  }

  const isValid = Object.keys(errors).length === 0;
  return { errors, warnings, isValid };
}

/* ── SOAP Note Validation ── */

export function validateSoapNote(text: string, field: string): { isValid: boolean; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { isValid: true }; // Empty is allowed (optional)
  if (trimmed.length < 10) {
    return { isValid: false, error: `${field} note must be at least 10 characters.` };
  }
  return { isValid: true };
}

/* ── Pre-Sign Encounter Validation ── */

export interface SignCheckResult {
  canSign: boolean;
  missing: string[];
}

export function validateForSigning(opts: {
  bpSystolic: string; bpDiastolic: string; temp: string; pulse: string;
  subjective: string; assessment: string;
  diagnosesCount: number;
}): SignCheckResult {
  const missing: string[] = [];

  if (!opts.bpSystolic.trim() || !opts.bpDiastolic.trim()) missing.push('Blood Pressure (BP)');
  if (!opts.temp.trim()) missing.push('Temperature');
  if (!opts.pulse.trim()) missing.push('Pulse');
  if (!opts.subjective.trim()) missing.push('SOAP Subjective note');
  if (!opts.assessment.trim()) missing.push('SOAP Assessment note');
  if (opts.diagnosesCount === 0) missing.push('At least 1 Diagnosis');

  return { canSign: missing.length === 0, missing };
}
