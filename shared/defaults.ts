export const DEFAULT_STATUS_LABELS = [
  'New',
  'No Answer',
  'Busy',
  'Spoke - Interested',
  'Spoke - Not Interested',
  'Callback',
  'Closed - Won',
  'Closed - Lost',
] as const

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  'New': '#6b7280',
  'No Answer': '#b91c1c',
  'Busy': '#a16207',
  'Spoke - Interested': '#15803d',
  'Spoke - Not Interested': '#6b7280',
  'Callback': '#a16207',
  'Closed - Won': '#15803d',
  'Closed - Lost': '#6b7280',
}
