export type Role = 'owner' | 'agent'
export type Intent = 'buy' | 'rent' | 'sell' | 'invest'
export type LeadSource =
  | 'manual' | 'import' | 'whatsapp' | 'propertyguru'
  | 'iproperty' | 'facebook' | 'referral' | 'walkin'
export type ActivityType =
  | 'created' | 'call' | 'whatsapp' | 'status_change'
  | 'note' | 'assigned' | 'imported'

export type OptionalFieldKey =
  | 'email' | 'intent' | 'propertyType' | 'budget' | 'tags'

export interface WorkspaceSettings {
  enabledOptionalFields: OptionalFieldKey[]
  areas: string[]
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  enabledOptionalFields: [],
  areas: [],
}
