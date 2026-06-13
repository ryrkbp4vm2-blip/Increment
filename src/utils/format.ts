const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

/** 0 -> 'aa', 1 -> 'ab', ... 25 -> 'az', 26 -> 'ba', ... */
function alphaSuffix(index: number): string {
  const first = Math.floor(index / 26) % 26;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) {
    return n < 100 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
  }
  let tier = Math.floor(Math.log10(n) / 3);
  let scaled = n / 10 ** (tier * 3);
  // log10 float fuzz at exact powers of 1000 can leave scaled at ~1000.
  if (scaled >= 1000) {
    tier++;
    scaled /= 1000;
  }
  const suffix = tier < SUFFIXES.length ? SUFFIXES[tier] : alphaSuffix(tier - SUFFIXES.length);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return scaled.toFixed(digits) + suffix;
}

export function formatRate(n: number): string {
  return formatNumber(n) + '/s';
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
