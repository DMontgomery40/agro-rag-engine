import { useState, useRef, useEffect } from 'react';
import { useTooltips } from '@/hooks/useTooltips';

interface TooltipIconProps {
  name: string;
}

/**
 * TooltipIcon - Renders a help icon with tooltip bubble
 * 
 * Uses the global tooltip system from tooltips.js via useTooltips hook.
 * Renders proper DOM structure for tooltip display with hover/click behavior.
 */
export function TooltipIcon({ name }: TooltipIconProps) {
  const { tooltips } = useTooltips();
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get tooltip HTML content
  const content = tooltips[name] || `<span class="tt-title">${name}</span><div>No tooltip available.</div>`;

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    if (visible) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [visible]);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(v => !v);
  };

  return (
    <span 
      ref={wrapRef}
      className="tooltip-wrap" 
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <span
        className="help-icon"
        tabIndex={0}
        aria-label={`Help: ${name}`}
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ cursor: 'help' }}
      >
        ?
      </span>
      <div
        className={`tooltip-bubble ${visible ? 'tooltip-visible' : ''}`}
        role="tooltip"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </span>
  );
}

