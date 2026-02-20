/**
 * Formats a duration in seconds to a short human-readable string.
 * Uses unit abbreviations: s (seconds), m (minutes), h (hours).
 *
 * @param totalSeconds - Duration in seconds
 * @returns Formatted string e.g. "23s", "1m", "1m 20s", "2h 5m 30s"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0 || !Number.isFinite(totalSeconds)) {
    return "0s";
  }
  const secs = Math.floor(totalSeconds);

  if (secs < 60) {
    return `${secs}s`;
  }

  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}
