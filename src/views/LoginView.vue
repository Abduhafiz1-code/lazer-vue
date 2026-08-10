<template>
  <div class="min-h-screen flex items-center justify-center bg-bg">
    <div class="w-full max-w-sm bg-panel border border-line rounded-xl p-8">
      <h1 class="text-lg font-medium mb-1">Lazer Chizma</h1>
      <p class="text-text2 text-sm mb-6">Kirish uchun email manzilingizni kiriting.</p>

      <form v-if="!auth.magicLinkSent" @submit.prevent="submit">
        <input
          v-model="email"
          type="email"
          required
          placeholder="email@misol.com"
          class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          :disabled="sending"
          class="w-full bg-accent text-bg font-medium rounded-lg py-2 text-sm disabled:opacity-60"
        >
          {{ sending ? 'Yuborilmoqda…' : 'Kirish havolasini yuborish' }}
        </button>
        <p v-if="error" class="text-cutc text-xs mt-3">{{ error }}</p>
      </form>

      <div v-else class="text-sm text-text2 leading-relaxed">
        <span class="text-white">{{ email }}</span> manziliga kirish havolasi yuborildi.
        Emailingizni tekshiring va havolani bosing.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const email = ref('')
const sending = ref(false)
const error = ref('')

async function submit() {
  sending.value = true
  error.value = ''
  try {
    await auth.signInWithEmail(email.value)
  } catch (e) {
    error.value = e.message || 'Xatolik yuz berdi.'
  } finally {
    sending.value = false
  }
}
</script>
