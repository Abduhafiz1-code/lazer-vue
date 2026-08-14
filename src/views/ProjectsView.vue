<template>
  <div class="min-h-screen bg-bg">
    <header class="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-bg/95 backdrop-blur z-10">
      <div class="flex items-center gap-2">
        <img src="/logo-mark.png" alt="" class="w-6 h-6 rounded-md" />
        <h1 class="text-base font-medium text-white">Lazer Chizma</h1>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs text-text2 hidden sm:inline">{{ auth.user?.email }}</span>
        <button @click="signOut" class="text-sm text-text2 hover:text-white transition">Chiqish</button>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-sm font-medium text-text2 uppercase tracking-wide">Loyihalarim</h2>
        <button
          @click="createNew"
          :disabled="creating"
          class="bg-accent hover:bg-accent/90 text-bg font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-60 transition flex items-center gap-1.5"
        >
          <span class="text-base leading-none">+</span> {{ creating ? 'Yaratilmoqda…' : 'Yangi loyiha' }}
        </button>
      </div>

      <div v-if="store.loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-panel border border-line animate-pulse"></div>
      </div>

      <div v-else-if="store.items.length === 0" class="text-center py-16 border border-dashed border-line rounded-xl">
        <div class="text-3xl mb-3">✎</div>
        <p class="text-text2 text-sm mb-4">Hali loyiha yo'q.</p>
        <button @click="createNew" class="text-accent text-sm hover:underline">Birinchi chizmangizni yarating →</button>
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="p in store.items"
          :key="p.id"
          class="group flex items-center justify-between bg-panel border border-line hover:border-accent/50 rounded-lg px-4 py-3 transition"
        >
          <button class="text-sm text-left hover:text-accent transition flex-1 min-w-0" @click="open(p.id)">
            <span class="block truncate text-white">{{ p.name }}</span>
            <span class="block text-xs text-text2 mt-0.5">{{ formatDate(p.updated_at) }}</span>
          </button>
          <button
            class="text-xs text-text2 hover:text-cutc px-2 py-1 opacity-0 group-hover:opacity-100 transition"
            @click="remove(p.id)"
          >O'chirish</button>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const store = useProjectsStore()
const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const creating = ref(false)

onMounted(() => {
  store.fetchAll().catch((e) => toast.error(e.message || "Loyihalarni yuklab bo'lmadi."))
})

async function createNew() {
  creating.value = true
  try {
    const p = await store.create('Yangi chizma')
    router.push({ name: 'editor', params: { id: p.id } })
  } catch (e) {
    toast.error(e.message || "Loyiha yaratib bo'lmadi.")
  } finally {
    creating.value = false
  }
}

function open(id) {
  router.push({ name: 'editor', params: { id } })
}

async function remove(id) {
  if (!confirm("Loyihani o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return
  try {
    await store.remove(id)
    toast.success("Loyiha o'chirildi.")
  } catch (e) {
    toast.error(e.message || "O'chirishda xatolik yuz berdi.")
  }
}

async function signOut() {
  await auth.signOut()
  router.push({ name: 'login' })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ')
}
</script>
