// AGRO - Admin Tab Component (React)
// Main Admin configuration tab with subtab navigation
// Structure matches /gui/index.html exactly with all subtabs rendered and visibility controlled by className

import { useState } from 'react';
import { AdminSubtabs } from '@/components/Admin/AdminSubtabs';
import { GeneralSubtab } from '@/components/Admin/GeneralSubtab';
import { GitIntegrationSubtab } from '@/components/Admin/GitIntegrationSubtab';
import { SecretsSubtab } from '@/components/Admin/SecretsSubtab';
import { IntegrationsSubtab } from '@/components/Admin/IntegrationsSubtab';

export default function AdminTab() {
  const [activeSubtab, setActiveSubtab] = useState('general');

  return (
    <div id="tab-admin" className="tab-content active">
      {/* Subtab navigation */}
      <AdminSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* All subtabs rendered with visibility controlled by className */}
      <div id="tab-admin-general" className={`admin-subtab-content ${activeSubtab === 'general' ? 'active' : ''}`}>
        <GeneralSubtab />
      </div>

      <div id="tab-admin-git" className={`admin-subtab-content ${activeSubtab === 'git' ? 'active' : ''}`}>
        <GitIntegrationSubtab />
      </div>

      <div id="tab-admin-secrets" className={`admin-subtab-content ${activeSubtab === 'secrets' ? 'active' : ''}`}>
        <SecretsSubtab />
      </div>

      <div id="tab-admin-integrations" className={`admin-subtab-content ${activeSubtab === 'integrations' ? 'active' : ''}`}>
        <IntegrationsSubtab />
      </div>
    </div>
  );
}
