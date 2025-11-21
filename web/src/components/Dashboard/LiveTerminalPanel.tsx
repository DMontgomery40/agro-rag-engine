// AGRO - Live Terminal Panel Component
// Dropdown terminal that slides down with bezier animation

import React, { useEffect, useRef, useState } from 'react';

interface LiveTerminalPanelProps {
  containerId: string;
  isVisible: boolean;
}

export function LiveTerminalPanel({ containerId, isVisible }: LiveTerminalPanelProps) {
  const terminalRef = useRef<any>(null);

  useEffect(() => {
    if (isVisible && !terminalRef.current) {
      const w = window as any;
      if (w.LiveTerminal) {
        try {
          terminalRef.current = new w.LiveTerminal(containerId);
          console.log(`[LiveTerminalPanel] Initialized: ${containerId}`);
        } catch (e) {
          console.error(`[LiveTerminalPanel] Failed to init ${containerId}:`, e);
        }
      }
    }
  }, [isVisible, containerId]);

  return (
    <div
      id={containerId}
      style={{
        maxHeight: isVisible ? '400px' : '0',
        opacity: isVisible ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        marginTop: isVisible ? '12px' : '0',
      }}
    />
  );
}

