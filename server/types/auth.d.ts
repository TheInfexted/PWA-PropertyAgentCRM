declare module '#auth-utils' {
  interface UserSession {
    user: {
      id: number
      email: string
      name: string
    }
    workspaceId: number
    role: 'owner' | 'agent'
  }
}

export {}
