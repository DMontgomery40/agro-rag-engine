// AGRO - Quick Action Button Component
// Reusable action button with icon and label

import React from 'react';

interface QuickActionButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  dataAction?: string;
}

export function QuickActionButton({ id, icon, label, onClick, dataAction }: QuickActionButtonProps) {
  return (
    <button
      id={id}
      className="action-btn"
      data-action={dataAction}
      onClick={onClick}
      style={{
        background: 'var(--bg-elev1)',
        border: '1px solid var(--line)',
        color: 'var(--fg)',
        padding: '16px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        fontSize: '12px',
        fontWeight: 600,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elev2)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-elev1)';
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--fg)';
      }}
    >
      <div style={{ color: 'var(--link)', fontSize: '24px' }}>{icon}</div>
      <span>{label}</span>
    </button>
  );
}

