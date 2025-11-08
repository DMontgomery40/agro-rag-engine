// Formatting utilities for storage calculator
// Converts bytes to human-readable formats and numbers to localized strings

/**
 * Format bytes to human-readable format (KiB, MiB, GiB, TiB)
 * @param bytes - Number of bytes to format
 * @returns Formatted string with unit
 */
export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes === 0) return '0 B';

  const abs = Math.abs(bytes);
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

  if (abs < KB) return `${bytes.toFixed(0)} B`;
  if (abs < MB) return `${nf.format(bytes / KB)} KiB`;
  if (abs < GB) return `${nf.format(bytes / MB)} MiB`;
  if (abs < TB) return `${nf.format(bytes / GB)} GiB`;
  return `${nf.format(bytes / TB)} TiB`;
}

/**
 * Format number with thousands separators
 * @param num - Number to format
 * @returns Formatted string with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Parse bytes string back to number (for round-trip operations)
 * @param str - Formatted bytes string (e.g., "5.2 GiB")
 * @returns Number of bytes
 */
export function parseBytes(str: string): number {
  const match = str.match(/^([\d,]+(?:\.\d+)?)\s*([A-Za-z]+)$/);
  if (!match) return 0;

  const value = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    'B': 1,
    'KIB': 1024,
    'MIB': 1024 * 1024,
    'GIB': 1024 * 1024 * 1024,
    'TIB': 1024 * 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
}
