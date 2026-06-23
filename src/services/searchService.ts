import { searchPatients } from './patientService';
import { getAllEncounters } from './encounterService';
import { getAllPrescriptions } from './prescriptionService';
import { getAllOrders } from './labService';
import type { UserRole } from '../models/types';

export interface SearchResult {
  type: 'patient' | 'encounter' | 'prescription' | 'lab';
  id: number;
  title: string;
  subtitle: string;
  path: string;
}

// Which entity types each role can search
const ROLE_ACCESS: Record<string, string[]> = {
  ADMIN: ['patient', 'encounter', 'prescription', 'lab'],
  CLINICIAN: ['patient', 'encounter', 'prescription', 'lab'],
  RECEPTION: ['patient', 'encounter'],
  PHARMACIST: ['prescription'],
  LAB_TECHNICIAN: ['lab'],
  FINANCE_OFFICER: ['patient'],
  PATIENT: ['prescription', 'lab'],
  COMPLIANCE_OFFICER: [],
};

export async function globalSearch(query: string, role: UserRole): Promise<SearchResult[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  const q = query.toLowerCase();
  const allowed = ROLE_ACCESS[role] || [];
  const results: SearchResult[] = [];

  const promises: Promise<void>[] = [];

  if (allowed.includes('patient')) {
    promises.push(
      searchPatients(query).then(patients => {
        for (const p of patients.slice(0, 5)) {
          results.push({
            type: 'patient',
            id: p.patientId,
            title: p.name,
            subtitle: `MRN: ${p.mrn} • ${p.gender}`,
            path: `/patients`,
          });
        }
      }).catch(() => {})
    );
  }

  if (allowed.includes('encounter')) {
    promises.push(
      getAllEncounters().then(encounters => {
        const filtered = encounters.filter(e =>
          e.patientName.toLowerCase().includes(q) ||
          e.visitType.toLowerCase().includes(q) ||
          String(e.encounterId).includes(q)
        ).slice(0, 5);
        for (const e of filtered) {
          results.push({
            type: 'encounter',
            id: e.encounterId,
            title: `Encounter #${e.encounterId}`,
            subtitle: `${e.patientName} • ${e.visitType} • ${e.status}`,
            path: `/encounters/${e.encounterId}`,
          });
        }
      }).catch(() => {})
    );
  }

  if (allowed.includes('prescription')) {
    promises.push(
      getAllPrescriptions().then(rxs => {
        const filtered = rxs.filter(rx =>
          rx.patientName.toLowerCase().includes(q) ||
          rx.medicationName.toLowerCase().includes(q) ||
          String(rx.rxId).includes(q)
        ).slice(0, 5);
        for (const rx of filtered) {
          results.push({
            type: 'prescription',
            id: rx.rxId,
            title: rx.medicationName,
            subtitle: `${rx.patientName} • ${rx.status}`,
            path: `/prescriptions/${rx.rxId}`,
          });
        }
      }).catch(() => {})
    );
  }

  if (allowed.includes('lab')) {
    promises.push(
      getAllOrders().then(orders => {
        const filtered = orders.filter(o =>
          o.patientName.toLowerCase().includes(q) ||
          String(o.labOrderId).includes(q) ||
          (o.sampleId && o.sampleId.toLowerCase().includes(q))
        ).slice(0, 5);
        for (const o of filtered) {
          results.push({
            type: 'lab',
            id: o.labOrderId,
            title: `Lab #${o.labOrderId}`,
            subtitle: `${o.patientName} • ${o.status}`,
            path: `/lab/${o.labOrderId}`,
          });
        }
      }).catch(() => {})
    );
  }

  await Promise.all(promises);
  return results;
}
