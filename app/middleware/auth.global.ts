export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  const isPublic = (path: string) => publicRoutes.includes(path) || path.startsWith('/invite/')
  const { loggedIn, fetch: fetchSession } = useUserSession()
  await fetchSession()

  if (loggedIn.value) {
    if (isPublic(to.path)) return navigateTo('/')
    return
  }

  const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/auth/state')
  if (needsSetup && to.path !== '/setup') return navigateTo('/setup')
  if (!needsSetup && to.path === '/setup') return navigateTo('/login')
  if (!isPublic(to.path)) return navigateTo('/login')
})
