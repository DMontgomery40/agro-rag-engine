// AGRO - Infrastructure Tab Component (React)
// Main Infrastructure configuration tab with subtab navigation
// Structure matches /gui/index.html exactly with all subtabs rendered and visibility controlled by className

import { useState } from 'react';
import { InfrastructureSubtabs } from '@/components/Infrastructure/InfrastructureSubtabs';
import { ServicesSubtab } from '@/components/Infrastructure/ServicesSubtab';
import { MCPSubtab } from '@/components/Infrastructure/MCPSubtab';
import { PathsSubtab } from '@/components/Infrastructure/PathsSubtab';
import { MonitoringSubtab } from '@/components/Infrastructure/MonitoringSubtab';

export default function InfrastructureTab() {
  const [activeSubtab, setActiveSubtab] = useState('services');

  return (
    <div id="tab-infrastructure" className="tab-content active">
      {/* Subtab navigation */}
      <InfrastructureSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* All subtabs rendered with visibility controlled by className */}
      <div id="tab-infrastructure-services" className={`infrastructure-subtab-content ${activeSubtab === 'services' ? 'active' : ''}`}>
        <ServicesSubtab />
      </div>

      <div id="tab-infrastructure-mcp" className={`infrastructure-subtab-content ${activeSubtab === 'mcp' ? 'active' : ''}`}>
        <MCPSubtab />
      </div>

      <div id="tab-infrastructure-paths" className={`infrastructure-subtab-content ${activeSubtab === 'paths' ? 'active' : ''}`}>
        <PathsSubtab />
      </div>

      <div id="tab-infrastructure-monitoring" className={`infrastructure-subtab-content ${activeSubtab === 'monitoring' ? 'active' : ''}`}>
        <MonitoringSubtab />
      </div>
    </div>
  );
}
