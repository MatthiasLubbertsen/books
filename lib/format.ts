export function relativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'just now';

  const diffMin = diffSec / 60;
  if (diffMin < 60) return ago(diffMin, 'minute');

  const diffHour = diffMin / 60;
  if (diffHour < 24) return ago(diffHour, 'hour');

  const diffDay = diffHour / 24;
  if (diffDay < 7) return ago(diffDay, 'day');

  const diffWeek = diffDay / 7;
  if (diffWeek < 4.345) return ago(diffWeek, 'week');

  const diffMonth = diffDay / 30.44;
  if (diffMonth < 12) return ago(diffMonth, 'month');

  return ago(diffDay / 365.25, 'year');
}

function ago(value: number, unit: string): string {
  const rounded = Math.max(1, Math.floor(value));
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'} ago`;
}
