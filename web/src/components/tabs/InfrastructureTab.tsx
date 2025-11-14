// AGRO - Infrastructure Tab Component (React)
// Main Infrastructure configuration tab with subtab navigation

import { useState } from 'react';
import { InfrastructureSubtabs } from '@/components/Infrastructure/InfrastructureSubtabs';
import { ServicesSubtab } from '@/components/Infrastructure/ServicesSubtab';
import { MCPSubtab } from '@/components/Infrastructure/MCPSubtab';
import { PathsSubtab } from '@/components/Infrastructure/PathsSubtab';
import { MonitoringSubtab } from '@/components/Infrastructure/MonitoringSubtab';

export default function InfrastructureTab() {
  const [activeSubtab, setActiveSubtab] = useState('services');

  return (
    <>
      {/* Subtab navigation */}
      <InfrastructureSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* Subtab content */}
      <div className="tab-panels">
        {activeSubtab === 'services' && <ServicesSubtab />}
        {activeSubtab === 'mcp' && <MCPSubtab />}
        {activeSubtab === 'paths' && <PathsSubtab />}
        {activeSubtab === 'monitoring' && <MonitoringSubtab />}
      </div>
    </>
  );
}
