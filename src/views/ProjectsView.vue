<template>
  <div class="min-h-screen bg-bg">
    <header class="flex items-center justify-between px-6 py-4 border-b border-line">
      <h1 class="text-base font-medium">Lazer Chizma — loyihalarim</h1>
      <button @click="signOut" class="text-sm text-text2 hover:text-white">Chiqish</button>
    </header>

    <main class="max-w-3xl mx-auto px-6 py-8">
      <button
        @click="createNew"
        class="mb-6 bg-accent text-bg font-medium rounded-lg px-4 py-2 text-sm"
      >
        + Yangi loyiha
      </button>

      <div v-if="store.loading" class="text-text2 text-sm">Yuklanmoqda…</div>
      <div v-else-if="store.items.length === 0" class="text-text2 text-sm">
        Hali loyiha yo'q. Yuqoridagi tugma orqali birinchisini yarating.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="p in store.items"
          :key="p.id"
          class="flex items-center justify-between bg-panel border border-line rounded-lg px-4 py-3"
        >
          <button class="text-sm text-left hover:text-accent" @click="open(p.id)">
            {{ p.name }}
            <span class="block text-xs text-text2 mt-0.5">{{ formatDate(p.updated_at) }}</span>
          </button>
          <button class="text-xs text-cutc px-2 py-1" @click="remove(p.id)">O'chirish</button>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useAuthStore } from '../stores/auth'

const store = useProjectsStore()
const auth = useAuthStore()
const router = useRouter()

onMounted(() => store.fetchAll())

async function createNew() {
  const p = await store.create('Yangi chizma')
  router.push({ name: 'editor', params: { id: p.id } })
}

function open(id) {
  router.push({ name: 'editor', params: { id } })
}

async function remove(id) {
  if (confirm("Loyihani o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.")) {
    await store.remove(id)
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
