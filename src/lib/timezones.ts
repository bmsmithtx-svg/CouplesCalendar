const fallbackTimeZones = [
  'America/Chicago',
  'America/New_York',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
] as const;

type SupportedValuesIntl = {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
}

export function getTimeZoneOptions() {
  const supportedValuesOf = (globalThis.Intl as unknown as SupportedValuesIntl).supportedValuesOf;

  if (supportedValuesOf) {
    return supportedValuesOf('timeZone');
  }

  return [...fallbackTimeZones];
}

export function isValidTimeZone(timeZone: string) {
  if (!timeZone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
