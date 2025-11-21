// AGRO - DashboardSubtabs Component
// Subtab navigation for Dashboard tab

import { useEffect } from 'react';

interface DashboardSubtabsProps {
  activeSubtab: string;
  onSubtabChange: (subtab: string) => void;
}

export function DashboardSubtabs({ activeSubtab, onSubtabChange }: DashboardSubtabsProps) {
  const subtabs = [
    { id: 'overview', title: 'Overview' },
    { id: 'help', title: 'Help & Glossary' }
  ];

  // Ensure a default subtab is selected
  useEffect(() => {
    if (!activeSubtab) {
      onSubtabChange('overview');
    }
  }, [activeSubtab, onSubtabChange]);

  return (
    <div className="subtab-bar" id="dashboard-subtabs" style={{ display: 'flex' }}>
      {subtabs.map(subtab => (
        <button
          key={subtab.id}
          className={`subtab-btn ${activeSubtab === subtab.id ? 'active' : ''}`}
          data-subtab={subtab.id}
          onClick={() => onSubtabChange(subtab.id)}
        >
          {subtab.title}
        </button>
      ))}
    </div>
  );
}
