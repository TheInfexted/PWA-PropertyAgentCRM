import { dateInputToStored } from '~~/shared/utils/followup'

export interface DueLead {
  id: number
  name: string
  phoneE164: string | null
  phoneRaw: string | null
  area: string
  statusId: number | null
  nextFollowUpAt: string | null
}

export function useFollowUps() {
  const request = useRequestFetch()
  const { update } = useLeads()
  async function listDue() {
    return request<DueLead[]>('/api/leads/due')
  }
  async function reschedule(id: number, date: string) {
    return update(id, { nextFollowUpAt: dateInputToStored(date) })
  }
  async function markDone(id: number) {
    return update(id, { nextFollowUpAt: null })
  }
  return { listDue, reschedule, markDone }
}
