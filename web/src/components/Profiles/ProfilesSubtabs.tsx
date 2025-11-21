// AGRO - Profiles Subtabs Component
// Subtab navigation for Profiles tab (Budget, Management, Overrides)

import { useEffect } from 'react';

interface ProfilesSubtabsProps {
  activeSubtab: string;
  onSubtabChange: (subtab: string) => void;
}

export function ProfilesSubtabs({ activeSubtab, onSubtabChange }: ProfilesSubtabsProps) {
  useEffect(() => {
    // Legacy module compatibility - dispatch event for legacy JS
    window.dispatchEvent(new CustomEvent('subtab-changed', {
      detail: { parent: 'profiles', subtab: activeSubtab }
    }));
  }, [activeSubtab]);

  return (
    <div id="profiles-subtabs" className="subtab-bar" data-state="visible" style={{ display: 'flex' }}>
      <button
        className={`subtab-btn ${activeSubtab === 'budget' ? 'active' : ''}`}
        data-subtab="budget"
        data-parent="profiles"
        onClick={() => onSubtabChange('budget')}
      >
        Budget
      </button>
      <button
        className={`subtab-btn ${activeSubtab === 'management' ? 'active' : ''}`}
        data-subtab="management"
        data-parent="profiles"
        onClick={() => onSubtabChange('management')}
      >
        Management
      </button>
      <button
        className={`subtab-btn ${activeSubtab === 'overrides' ? 'active' : ''}`}
        data-subtab="overrides"
        data-parent="profiles"
        onClick={() => onSubtabChange('overrides')}
      >
        Overrides
      </button>
    </div>
  );
}
