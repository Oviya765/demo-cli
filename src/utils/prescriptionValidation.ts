// Industry-standard prescription form validation utilities

export interface RxFieldErrors {
  medication?: string;
  dosage?: string;
  durationDays?: string;
  quantity?: string;
  repeats?: string;
  notes?: string;
  patient?: string;
  encounterId?: string;
}

export interface RxFieldWarnings {
  durationDays?: string;
  quantity?: string;
  repeats?: string;
}

// Dosage format regex — accepts patterns like "500mg", "1 tablet", "5 ml", "2.5mg", "10 units"
const DOSAGE_REGEX = /^\d+(\.\d+)?\s*(mg|g|ml|mcg|units?|tablets?|capsules?|drops?|puffs?|patch(es)?|sachets?|iu|meq|mmol|%)?(\s|$)/i;

// Frequency multiplier map for quantity consistency check
const FREQ_MULTIPLIER: Record<string, number> = {
  'Once daily (OD)': 1,
  'Twice daily (BD)': 2,
  'Three times daily (TDS)': 3,
  'Four times daily (QDS)': 4,
  'Every 4 hours (Q4H)': 6,
  'Every 6 hours (Q6H)': 4,
  'Every 8 hours (Q8H)': 3,
  'As needed (PRN)': 1,
  'At bedtime (HS)': 1,
  'Stat (STAT)': 1,
};

export interface ValidateMedFieldsInput {
  medication: { medId: number; name: string } | null;
  dosage: string;
  durationDays: string;
  quantity: string;
  repeats: string;
  notes: string;
  frequency: string;
  existingMedIds?: number[];
}

export interface ValidateMedFieldsResult {
  errors: RxFieldErrors;
  warnings: RxFieldWarnings;
  isValid: boolean;
}

/**
 * Validate all medication item fields before adding to list.
 */
export function validateMedFields(input: ValidateMedFieldsInput): ValidateMedFieldsResult {
  const errors: RxFieldErrors = {};
  const warnings: RxFieldWarnings = {};

  // Medication selection
  if (!input.medication) {
    errors.medication = 'Select a medication from the formulary list.';
  } else if (input.existingMedIds?.includes(input.medication.medId)) {
    errors.medication = 'This medication is already in the prescription list.';
  }

  // Dosage
  const dosageTrimmed = input.dosage.trim();
  if (!dosageTrimmed) {
    errors.dosage = 'Dosage is required.';
  } else if (dosageTrimmed.length < 2) {
    errors.dosage = 'Dosage must be at least 2 characters.';
  } else if (dosageTrimmed.length > 50) {
    errors.dosage = 'Dosage must not exceed 50 characters.';
  } else if (!DOSAGE_REGEX.test(dosageTrimmed)) {
    // Not blocking — just warn since free-text is allowed in some systems
    warnings.quantity = undefined; // placeholder
  }

  // Duration
  const dur = Number(input.durationDays);
  if (!input.durationDays.trim()) {
    errors.durationDays = 'Duration is required.';
  } else if (!Number.isInteger(dur) || dur < 1) {
    errors.durationDays = 'Duration must be a whole number ≥ 1.';
  } else if (dur > 365) {
    errors.durationDays = 'Duration cannot exceed 365 days.';
  } else if (dur > 90) {
    warnings.durationDays = 'Long-term prescription (> 90 days) — confirm intended.';
  }

  // Quantity
  const qty = Number(input.quantity);
  if (!input.quantity.trim()) {
    errors.quantity = 'Quantity is required.';
  } else if (!Number.isInteger(qty) || qty < 1) {
    errors.quantity = 'Quantity must be a whole number ≥ 1.';
  } else if (qty > 9999) {
    errors.quantity = 'Quantity cannot exceed 9999.';
  } else if (dur >= 1 && qty >= 1) {
    // Consistency check: expected = frequency_multiplier × duration
    const multiplier = FREQ_MULTIPLIER[input.frequency] || 1;
    const expected = multiplier * dur;
    if (qty > expected * 2) {
      errors.quantity = `Quantity (${qty}) is too high for ${dur} days at ${input.frequency}. Expected ~${expected}.`;
    } else if (qty < expected) {
      errors.quantity = `Quantity (${qty}) is insufficient for ${dur} days at ${input.frequency}. Minimum required: ${expected}.`;
    }
  }

  // Repeats
  const rep = Number(input.repeats);
  if (input.repeats.trim() && (!Number.isInteger(rep) || rep < 0)) {
    errors.repeats = 'Repeats must be a whole number ≥ 0.';
  } else if (rep > 12) {
    errors.repeats = 'Repeats cannot exceed 12.';
  } else if (rep > 6) {
    warnings.repeats = 'High repeat count (> 6) — confirm intended.';
  }

  // Notes (optional, max length)
  if (input.notes.length > 500) {
    errors.notes = 'Notes must not exceed 500 characters.';
  }

  const isValid = Object.keys(errors).length === 0;
  return { errors, warnings, isValid };
}

/**
 * Validate patient & encounter context before submission.
 */
export function validateContextFields(input: {
  selectedPatient: boolean;
  encounterId: string;
  hasEncounterFromNav: boolean;
}): RxFieldErrors {
  const errors: RxFieldErrors = {};

  if (!input.selectedPatient) {
    errors.patient = 'Select a valid patient from the search results.';
  }

  if (!input.hasEncounterFromNav) {
    const eid = Number(input.encounterId);
    if (!input.encounterId.trim()) {
      errors.encounterId = 'Encounter ID is required.';
    } else if (!Number.isInteger(eid) || eid < 1) {
      errors.encounterId = 'Encounter ID must be a positive integer.';
    } else if (eid > 99999) {
      errors.encounterId = 'Encounter ID seems invalid (> 99999).';
    }
  }

  return errors;
}
