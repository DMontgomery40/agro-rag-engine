// AGRO - Dashboard Page
// Main dashboard with System Status, Monitoring, Storage, Help, and Glossary subtabs

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardSubtabs } from '../components/Dashboard/DashboardSubtabs';
import { SystemStatusSubtab } from '../components/Dashboard/SystemStatusSubtab';
import { MonitoringSubtab } from '../components/Dashboard/MonitoringSubtab';
import { StorageSubtab } from '../components/Dashboard/StorageSubtab';
import { HelpSubtab } from '../components/Dashboard/HelpSubtab';
import { GlossarySubtab } from '../components/Dashboard/GlossarySubtab';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubtab, setActiveSubtab] = useState(searchParams.get('subtab') || 'system');

  // Update URL when subtab changes
  useEffect(() => {
    if (activeSubtab !== 'system') {
      setSearchParams({ subtab: activeSubtab });
    } else {
      setSearchParams({});
    }
  }, [activeSubtab, setSearchParams]);

  // Listen for URL changes (e.g., from Learn button in topbar)
  useEffect(() => {
    const urlSubtab = searchParams.get('subtab');
    if (urlSubtab && urlSubtab !== activeSubtab) {
      setActiveSubtab(urlSubtab);
    }
  }, [searchParams, activeSubtab]);

  return (
    <div id="tab-dashboard" className="tab-content">
      {/* Subtab navigation */}
      <DashboardSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* System Status Subtab */}
      <div style={{ display: activeSubtab === 'system' ? 'block' : 'none' }}>
        <SystemStatusSubtab />
      </div>

      {/* Monitoring Subtab */}
      <div style={{ display: activeSubtab === 'monitoring' ? 'block' : 'none' }}>
        <MonitoringSubtab />
      </div>

      {/* Storage Subtab */}
      <div style={{ display: activeSubtab === 'storage' ? 'block' : 'none' }}>
        <StorageSubtab />
      </div>

      {/* Help Subtab */}
      <div style={{ display: activeSubtab === 'help' ? 'block' : 'none' }}>
        <HelpSubtab />
      </div>

      {/* Glossary Subtab */}
      <div style={{ display: activeSubtab === 'glossary' ? 'block' : 'none' }}>
        <GlossarySubtab />
      </div>
    </div>
  );
}
