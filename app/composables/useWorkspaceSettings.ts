import type { WorkspaceSettings, OptionalFieldKey } from '~~/shared/types'

export function useWorkspaceSettings() {
  const request = useRequestFetch()
  const settings = useState<WorkspaceSettings>('ws-settings', () => ({ enabledOptionalFields: [], areas: [] }))
  const loaded = useState<boolean>('ws-settings-loaded', () => false)

  async function load(force = false) {
    if (loaded.value && !force) return settings.value
    const ws = await request<{ settings: WorkspaceSettings }>('/api/workspace')
    if (ws?.settings) settings.value = ws.settings
    loaded.value = true
    return settings.value
  }
  const enabledFields = computed<OptionalFieldKey[]>(() => settings.value.enabledOptionalFields ?? [])
  const areas = computed<string[]>(() => settings.value.areas ?? [])
  function isEnabled(key: OptionalFieldKey) { return enabledFields.value.includes(key) }

  return { settings, load, enabledFields, areas, isEnabled }
}
