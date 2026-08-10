import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    items: [],
    loading: false
  }),
  actions: {
    async fetchAll() {
      this.loading = true
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false })
      this.loading = false
      if (error) throw error
      this.items = data || []
    },
    async create(name = 'Yangi chizma') {
      const auth = useAuthStore()
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, shapes: [], user_id: auth.user.id })
        .select()
        .single()
      if (error) throw error
      this.items.unshift({ id: data.id, name: data.name, updated_at: data.updated_at })
      return data
    },
    async load(id) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    async save(id, name, shapes) {
      const { error } = await supabase
        .from('projects')
        .update({ name, shapes })
        .eq('id', id)
      if (error) throw error
      const item = this.items.find(p => p.id === id)
      if (item) item.name = name
    },
    async remove(id) {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(p => p.id !== id)
    }
  }
})
