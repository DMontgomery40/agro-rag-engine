// AGRO - Admin Tab Component (React)
// Main Admin configuration tab with subtab navigation

import { useState } from 'react';
import { AdminSubtabs } from '@/components/Admin/AdminSubtabs';
import { GeneralSubtab } from '@/components/Admin/GeneralSubtab';
import { GitIntegrationSubtab } from '@/components/Admin/GitIntegrationSubtab';
import { SecretsSubtab } from '@/components/Admin/SecretsSubtab';
import { IntegrationsSubtab } from '@/components/Admin/IntegrationsSubtab';

export default function AdminTab() {
  const [activeSubtab, setActiveSubtab] = useState('general');

  return (
    <>
      {/* Subtab navigation */}
      <AdminSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      {/* Subtab content */}
      <div className="tab-panels">
        {activeSubtab === 'general' && <GeneralSubtab />}
        {activeSubtab === 'git' && <GitIntegrationSubtab />}
        {activeSubtab === 'secrets' && <SecretsSubtab />}
        {activeSubtab === 'integrations' && <IntegrationsSubtab />}
      </div>
    </>
  );
}
