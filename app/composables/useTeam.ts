import { inviteLink } from '~~/shared/schemas/invite'

export interface Member { userId: number; name: string; email: string; role: 'owner' | 'agent' }
export interface PendingInvite { id: number; email: string; role: string; createdAt: string }

export function useTeam() {
  const request = useRequestFetch()
  return {
    listMembers: () => request<Member[]>('/api/members'),
    listInvites: () => request<PendingInvite[]>('/api/invites'),
    createInvite: (email: string) => request<{ token: string; email: string }>('/api/invites', { method: 'POST', body: { email } }),
    revokeInvite: (id: number) => request(`/api/invites/${id}`, { method: 'DELETE' }),
    linkFor: (token: string) => inviteLink(window.location.origin, token),
  }
}
