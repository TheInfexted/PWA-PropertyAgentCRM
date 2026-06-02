export interface Account {
  id: number
  name: string
  email: string
  role: 'owner' | 'agent'
  avatar: string | null
}

export function useAccount() {
  const request = useRequestFetch()
  const account = useState<Account | null>('account', () => null)

  async function load(force = false) {
    if (account.value && !force) return account.value
    account.value = await request<Account>('/api/account')
    return account.value
  }
  async function updateProfile(patch: { name?: string; avatar?: string | null }) {
    account.value = await request<Account>('/api/account', { method: 'PATCH', body: patch })
    return account.value
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    return request('/api/account/password', { method: 'POST', body: { currentPassword, newPassword } })
  }
  return { account, load, updateProfile, changePassword }
}
