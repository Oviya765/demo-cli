import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './MainLayout.css';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back' },
  '/patients': { title: 'Patients', subtitle: 'Manage patient records' },
  '/appointments': { title: 'Appointments', subtitle: 'Schedule & manage appointments' },
  '/encounters': { title: 'Encounters', subtitle: 'Clinical encounters & notes' },
  '/prescriptions': { title: 'Prescriptions', subtitle: 'Manage prescriptions' },
  '/lab': { title: 'Lab Orders', subtitle: 'Laboratory orders & results' },
  '/pharmacy': { title: 'Pharmacy', subtitle: 'Dispense records' },
  '/inventory': { title: 'Inventory', subtitle: 'Medication stock management' },
  '/invoices': { title: 'Invoices', subtitle: 'Billing & invoices' },
  '/reports': { title: 'Reports', subtitle: 'Analytics & reports' },
  '/admin/users': { title: 'User Management', subtitle: 'Manage staff accounts' },
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Match by prefix for sub-routes
  const matchedKey = Object.keys(pageTitles).find(
    key => location.pathname === key || location.pathname.startsWith(key + '/')
  );
  const pageInfo = matchedKey ? pageTitles[matchedKey] : { title: 'Clinic Flow' };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header
          onMenuClick={() => setSidebarOpen(prev => !prev)}
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
