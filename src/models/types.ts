// ── Enums ──

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type EncounterStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PrescriptionStatus = 'DRAFT' | 'ISSUED' | 'DISPENSED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED' |'UNPAID' |'PARTIALLY_PAID';
export type LabOrderStatus = 'ORDERED' | 'COLLECTED' | 'RESULTS_REPORTED' | 'CRITICAL_REPORTED' | 'CANCELLED';
export type LabResultFlag = 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
export type InventoryStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type MedicationStatus = 'ACTIVE' | 'INACTIVE';
export type DispenseStatus = 'DISPENSED' | 'RETURNED';
export type UserRole =
  | 'ADMIN'
  | 'PATIENT'
  | 'RECEPTION'
  | 'CLINICIAN'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'FINANCE_OFFICER'
  | 'COMPLIANCE_OFFICER';

// ── Auth ──

export interface AuthenticationRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface AuthenticationResponse {
  token: string;
  message?: string;
}

// ── User ──

export interface UserResponseDto {
  userId: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreateUserRequestDto {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: string;
  status?: string;
}

export interface AdminUpdateUserRequestDto {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: string;
  status: string;
}

// ── Patient ──

export interface PatientResponseDto {
  patientId: number;
  mrn: string;
  name: string;
  dob: string;
  gender: string;
  contactInfoJson: string;
  addressJson: string;
  primaryContact: string;
  insuranceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRequestDto {
  name: string;
  dob: string;
  gender: string;
  contactInfoJson: string;
  addressJson: string;
  primaryContact: string;
  insuranceId?: string;
  status?: string;
}

// ── Appointment ──

export interface AppointmentResponseDto {
  apptId: number;
  patientId: number;
  patientMrn: string;
  patientName: string;
  clinicianId: number;
  clinicianName: string;
  department: string;
  serviceType: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  createdById: number;
  createdByName: string;
  createdAt: string;
}

export interface AppointmentRequestDto {
  patientId: number;
  clinicianId: number;
  department: string;
  serviceType: string;
  startAt: string;
  endAt: string;
  status?: AppointmentStatus;
  createdById: number;
}

// ── Encounter ──

export interface EncounterResponseDto {
  encounterId: number;
  patientId: number;
  patientName: string;
  clinicianId: number;
  clinicianName: string;
  visitType: string;
  chiefComplaint: string;
  vitalsJson: string;
  notesJson: string;
  diagnosesJson: string;
  ordersJson: string;
  startAt: string;
  endAt: string;
  status: EncounterStatus;
  appointmentId?: number;
  signedById: number;
  signedByName: string;
  signedAt: string;
}

export interface EncounterRequestDto {
  patientId: number;
  visitType: string;
  chiefComplaint: string;
  vitalsJson: string;
  notesJson: string;
  diagnosesJson: string;
  ordersJson: string;
  appointmentId?: number;
  status?: EncounterStatus;
}

// ── Prescription ──

export interface PrescriptionResponseDto {
  rxId: number;
  encounterId: number;
  patientId: number;
  patientName: string;
  clinicianId: number;
  clinicianName: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  repeats: number;
  route: string;
  notes: string;
  status: PrescriptionStatus;
  issuedAt: string;
}

export interface PrescriptionRequestDto {
  encounterId: number;
  patientId: number;
  clinicianId: number;
  medicationId: number;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  repeats: number;
  route: string;
  notes?: string;
  status?: PrescriptionStatus;
}

// ── Medication ──

export interface MedicationResponseDto {
  medId: number;
  code: string;
  name: string;
  formulation: string;
  strength: string;
  atcCode: string;
  controlledFlag: boolean;
  status: MedicationStatus;
}

// ── Invoice ──

export interface InvoiceResponseDto {
  invoiceId: number;
  patientId: number;
  patientName: string;
  encounterId: number;
  lineItemsJson: string;
  subtotal: number;
  taxes: number;
  discounts: number;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
  status: InvoiceStatus;
}

// ── Payment ──

export interface PaymentResponseDto {
  paymentId: number;
  invoiceId: number;
  patientId: number;
  patientName: string;
  amount: number;
  method: string;
  paidAt: string;
  status: string;
}

// ── Lab ──

export interface LabOrderResponseDto {
  labOrderId: number;
  encounterId: number;
  patientId: number;
  patientName: string;
  orderedById: number;
  orderedByName: string;
  testsJson: string;
  sampleId: string;
  collectedAt: string;
  status: LabOrderStatus;
  resultUri: string;
  results: LabResultSummaryDto[];
}

export interface LabResultSummaryDto {
  resultId: number;
  testCode: string;
  value: string;
  units: string;
  flag: LabResultFlag;
  reportedAt: string;
}

export interface LabResultResponseDto {
  resultId: number;
  labOrderId: number;
  testCode: string;
  value: string;
  units: string;
  referenceRangeJson: string;
  flag: LabResultFlag;
  reportedAt: string;
  reportedById: number;
  reportedByName: string;
}

// ── Inventory ──

export interface InventoryResponseDto {
  inventoryId: number;
  medicationId: number;
  medicationCode: string;
  medicationName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  location: string;
  costPrice: number;
  status: InventoryStatus;
  expired: boolean;
}

// ── Report ──

export interface ReportResponseDto {
  reportId: number;
  scope: string;
  parametersJson: string;
  metricsJson: string;
  generatedById: number;
  generatedByName: string;
  generatedAt: string;
  reportUri: string;
}

// ── Dispense ──

export interface DispenseResponseDto {
  dispenseId: number;
  prescriptionId: number;
  inventoryItemId: number;
  medicationName: string;
  batchNumber: string;
  patientId: number;
  patientName: string;
  dispensedById: number;
  dispensedByName: string;
  quantity: number;
  dispensedAt: string;
  status: string;
}

// ── Auth context user ──

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  token: string;
  phone?: string;
  needsPasswordChange?: boolean;
}
