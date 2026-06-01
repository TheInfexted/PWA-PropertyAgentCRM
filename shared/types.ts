export type Role = 'owner' | 'agent'
export type Intent = 'buy' | 'rent' | 'sell' | 'invest'
export type LeadSource =
  | 'manual' | 'import' | 'whatsapp' | 'propertyguru'
  | 'iproperty' | 'facebook' | 'referral' | 'walkin'
export type ActivityType =
  | 'created' | 'call' | 'whatsapp' | 'status_change'
  | 'note' | 'assigned' | 'imported'

export const OPTIONAL_FIELD_KEYS = ['email', 'intent', 'propertyType', 'budget', 'tags'] as const
export type OptionalFieldKey = (typeof OPTIONAL_FIELD_KEYS)[number]

export const OPTIONAL_FIELD_LABELS: Record<OptionalFieldKey, string> = {
  email: 'Email',
  intent: 'Intent',
  propertyType: 'Property type',
  budget: 'Budget',
  tags: 'Tags',
}

export interface WorkspaceSettings {
  enabledOptionalFields: OptionalFieldKey[]
  areas: string[]
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  enabledOptionalFields: [],
  areas: [],
}
