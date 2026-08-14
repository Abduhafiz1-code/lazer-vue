import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/signup', name: 'signup', component: () => import('../views/SignupView.vue') },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('../views/ForgotPasswordView.vue') },
  { path: '/reset-password', name: 'reset-password', component: () => import('../views/ResetPasswordView.vue') },
  { path: '/', name: 'projects', component: () => import('../views/ProjectsView.vue'), meta: { requiresAuth: true } },
  { path: '/editor/:id?', name: 'editor', component: () => import('../views/EditorView.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const publicOnly = ['login', 'signup', 'forgot-password']

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.loading) {
    await auth.init()
  }
  // Supabase sends the user back with a recovery session; force them
  // through the "set new password" screen before anything else.
  if (auth.passwordRecovery && to.name !== 'reset-password') {
    return { name: 'reset-password' }
  }
  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login' }
  }
  if (publicOnly.includes(to.name) && auth.user) {
    return { name: 'projects' }
  }
  return true
})

export default router
