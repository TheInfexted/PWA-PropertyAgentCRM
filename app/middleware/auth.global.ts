export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  const { loggedIn, fetch: fetchSession } = useUserSession()
  await fetchSession()

  const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/auth/state')
  if (needsSetup && to.path !== '/setup') return navigateTo('/setup')
  if (!needsSetup && to.path === '/setup') return navigateTo('/login')

  if (!loggedIn.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
  if (loggedIn.value && publicRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})
