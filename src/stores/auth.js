import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true,
    initialized: false,
    magicLinkSent: false
  }),
  actions: {
    async init() {
      if (this.initialized) return
      this.initialized = true
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user || null
      this.loading = false
      supabase.auth.onAuthStateChange((_event, session) => {
        this.user = session?.user || null
      })
    },
    async signInWithEmail(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      this.magicLinkSent = true
    },
    async signOut() {
      await supabase.auth.signOut()
      this.user = null
    }
  }
})
