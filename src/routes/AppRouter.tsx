import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/guards/ProtectedRoute';
import type { UserRole } from '../models/types';

// Auth
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import FirstLoginChangePasswordPage from '../pages/auth/FirstLoginChangePasswordPage';

// Dashboard
import DashboardPage from '../pages/dashboard/DashboardPage';

// Encounters
import EncounterListPage from '../pages/encounters/EncounterListPage';
import EncounterDetailPage from '../pages/encounters/EncounterDetailPage';
import EncounterFormPage from '../pages/encounters/EncounterFormPage';
import EncounterSummaryPage from '../pages/patients/EncounterSummaryPage';

// Prescriptions
import PrescriptionListPage from '../pages/prescriptions/PrescriptionListPage';
import PrescriptionDetailPage from '../pages/prescriptions/PrescriptionDetailPage';
import PrescriptionFormPage from '../pages/prescriptions/PrescriptionFormPage';

// Appointments
import AppointmentListPage from '../pages/appointments/AppointmentListPage';
import AppointmentFormPage from '../pages/appointments/AppointmentFormPage';
import AppointmentDetailPage from '../pages/appointments/AppointmentDetailPage';

// Patients
import PatientListPage from '../pages/patients/PatientListPage';
import PatientDetailPage from '../pages/patients/PatientDetailPage';

// Lab Module
import LabDashboardPage from '../pages/lab/LabDashboradPage';
import LabOrderFormPage from '../pages/lab/LabOrderFormPage';
import LabOrderDetailPage from '../pages/lab/LabOrderDetailPage';

// Admin
import AdminUserManagementPage from '../pages/admin/AdminUserManagementPage';

// Profile
import ProfilePage from '../pages/profile/ProfilePage';

// Finance
import InvoicePage from '../pages/invoices/InvoicePage';
import ReportPage from '../pages/reports/ReportPage';

// Pharmacy & Inventory
import PharmacyPage from '../pages/pharmacy/PharmacyPage';
import InventoryPage from '../pages/inventory/InventoryPage';

/**
 * Role groups for route-level authorization. These mirror the sidebar
 * visibility rules and the backend Spring Security authorities so the UI and
 * API agree on who can access what.
 */
const ROLES: Record<string, UserRole[]> = {
  PATIENTS: ['ADMIN', 'CLINICIAN', 'RECEPTION'],
  APPOINTMENTS: ['ADMIN', 'CLINICIAN', 'RECEPTION', 'PATIENT'],
  ENCOUNTERS: ['ADMIN', 'CLINICIAN'],
  ENCOUNTER_SUMMARY: ['ADMIN', 'CLINICIAN', 'RECEPTION'],
  PRESCRIPTIONS_VIEW: ['ADMIN', 'CLINICIAN', 'PATIENT'],
  PRESCRIPTIONS_EDIT: ['CLINICIAN'],
  LAB_VIEW: ['ADMIN', 'CLINICIAN', 'LAB_TECHNICIAN', 'PATIENT'],
  LAB_CREATE: ['CLINICIAN'],
  PHARMACY: ['ADMIN', 'PHARMACIST'],
  INVENTORY: ['ADMIN', 'PHARMACIST'],
  INVOICES: ['ADMIN', 'FINANCE_OFFICER', 'RECEPTION'],
  REPORTS: ['ADMIN', 'FINANCE_OFFICER'],
  ADMIN: ['ADMIN'],
};

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Forced Password Change (Authenticated but before MainLayout access) */}
      <Route
        path="/first-login"
        element={
          <ProtectedRoute allowPasswordChangeOnly={true}>
            <FirstLoginChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Protected (inside MainLayout) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Available to every authenticated user */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Encounters */}
        <Route path="/encounters" element={<ProtectedRoute allowedRoles={ROLES.ENCOUNTERS}><EncounterListPage /></ProtectedRoute>} />
        <Route path="/encounters/new" element={<ProtectedRoute allowedRoles={ROLES.ENCOUNTERS}><EncounterFormPage /></ProtectedRoute>} />
        <Route path="/encounters/:id" element={<ProtectedRoute allowedRoles={ROLES.ENCOUNTERS}><EncounterDetailPage /></ProtectedRoute>} />
        <Route path="/encounters/:id/edit" element={<ProtectedRoute allowedRoles={ROLES.ENCOUNTERS}><EncounterFormPage /></ProtectedRoute>} />
        <Route path="/encounters/:id/summary" element={<ProtectedRoute allowedRoles={ROLES.ENCOUNTER_SUMMARY}><EncounterSummaryPage /></ProtectedRoute>} />

        {/* Prescriptions */}
        <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={ROLES.PRESCRIPTIONS_VIEW}><PrescriptionListPage /></ProtectedRoute>} />
        <Route path="/prescriptions/new" element={<ProtectedRoute allowedRoles={ROLES.PRESCRIPTIONS_EDIT}><PrescriptionFormPage /></ProtectedRoute>} />
        <Route path="/prescriptions/:id" element={<ProtectedRoute allowedRoles={ROLES.PRESCRIPTIONS_VIEW}><PrescriptionDetailPage /></ProtectedRoute>} />
        <Route path="/prescriptions/:id/edit" element={<ProtectedRoute allowedRoles={ROLES.PRESCRIPTIONS_EDIT}><PrescriptionFormPage /></ProtectedRoute>} />

        {/* Patients Registry */}
        <Route path="/patients" element={<ProtectedRoute allowedRoles={ROLES.PATIENTS}><PatientListPage /></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute allowedRoles={ROLES.PATIENTS}><PatientDetailPage /></ProtectedRoute>} />

        {/* Appointments */}
        <Route path="/appointments" element={<ProtectedRoute allowedRoles={ROLES.APPOINTMENTS}><AppointmentListPage /></ProtectedRoute>} />
        <Route path="/appointments/new" element={<ProtectedRoute allowedRoles={ROLES.APPOINTMENTS}><AppointmentFormPage /></ProtectedRoute>} />
        <Route path="/appointments/:id" element={<ProtectedRoute allowedRoles={ROLES.APPOINTMENTS}><AppointmentDetailPage /></ProtectedRoute>} />

        {/* Lab Module */}
        <Route path="/lab" element={<ProtectedRoute allowedRoles={ROLES.LAB_VIEW}><LabDashboardPage /></ProtectedRoute>} />
        <Route path="/lab/new" element={<ProtectedRoute allowedRoles={ROLES.LAB_CREATE}><LabOrderFormPage /></ProtectedRoute>} />
        <Route path="/lab/:id" element={<ProtectedRoute allowedRoles={ROLES.LAB_VIEW}><LabOrderDetailPage /></ProtectedRoute>} />

        {/* Pharmacy & Inventory */}
        <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={ROLES.PHARMACY}><PharmacyPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={ROLES.INVENTORY}><InventoryPage /></ProtectedRoute>} />

        {/* Finance */}
        <Route path="/invoices" element={<ProtectedRoute allowedRoles={ROLES.INVOICES}><InvoicePage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={ROLES.REPORTS}><ReportPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={ROLES.ADMIN}><AdminUserManagementPage /></ProtectedRoute>} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}


