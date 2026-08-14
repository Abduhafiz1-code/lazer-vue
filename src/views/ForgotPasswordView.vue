<template>
  <div class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="/logo-mark.png" alt="" class="w-8 h-8 rounded-md" />
        <span class="font-medium text-white">Lazer Chizma</span>
      </div>

      <div class="bg-panel border border-line rounded-xl p-8 shadow-xl shadow-black/20">
        <template v-if="!sent">
          <h1 class="text-lg font-medium mb-1 text-white">Parolni tiklash</h1>
          <p class="text-text2 text-sm mb-6">
            Email manzilingizni kiriting — parolni tiklash havolasini yuboramiz.
          </p>
          <form @submit.prevent="submit" class="space-y-3">
            <input
              v-model.trim="email"
              type="email"
              autocomplete="email"
              required
              placeholder="email@misol.com"
              class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
            <button
              type="submit"
              :disabled="sending"
              class="w-full bg-accent hover:bg-accent/90 text-bg font-medium rounded-lg py-2.5 text-sm disabled:opacity-60 transition">
              {{ sending ? "Yuborilmoqda…" : "Havola yuborish" }}
            </button>
            <p v-if="error" class="text-cutc text-xs bg-cutc/10 border border-cutc/30 rounded-lg px-3 py-2">{{ error }}</p>
          </form>
        </template>
        <template v-else>
          <div class="text-center py-2">
            <div class="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4 text-xl">✉</div>
            <h1 class="text-lg font-medium mb-2 text-white">Havola yuborildi</h1>
            <p class="text-text2 text-sm leading-relaxed">
              <span class="text-white">{{ email }}</span> manziliga parolni tiklash havolasi yuborildi.
            </p>
          </div>
        </template>

        <router-link :to="{ name: 'login' }" class="block text-center text-xs text-text2 hover:text-white mt-6">
          ← Kirish sahifasiga qaytish
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const email = ref("");
const sending = ref(false);
const error = ref("");
const sent = ref(false);

async function submit() {
  sending.value = true;
  error.value = "";
  try {
    await auth.sendPasswordReset(email.value);
    sent.value = true;
  } catch (e) {
    error.value = e.message || "Xatolik yuz berdi.";
  } finally {
    sending.value = false;
  }
}
</script>
