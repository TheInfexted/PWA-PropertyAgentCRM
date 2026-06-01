import type { StatusRow } from '~/composables/useStatuses'
import type { WorkspaceSettings } from '~~/shared/types'

export function useSettings() {
  const request = useRequestFetch()
  return {
    getWorkspace: () => request<{ id: number; name: string; settings: WorkspaceSettings }>('/api/workspace'),
    renameWorkspace: (name: string) => request('/api/workspace', { method: 'PATCH', body: { name } }),
    updateSettings: (settings: WorkspaceSettings) => request('/api/workspace', { method: 'PATCH', body: { settings } }),
    listStatuses: () => request<StatusRow[]>('/api/statuses'),
    createStatus: (label: string, color: string) => request<StatusRow>('/api/statuses', { method: 'POST', body: { label, color } }),
    updateStatus: (id: number, patch: { label?: string; color?: string }) => request<StatusRow>(`/api/statuses/${id}`, { method: 'PATCH', body: patch }),
    deleteStatus: (id: number) => request(`/api/statuses/${id}`, { method: 'DELETE' }),
    reorderStatuses: (ids: number[]) => request('/api/statuses/reorder', { method: 'POST', body: { ids } }),
  }
}
