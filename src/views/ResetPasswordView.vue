<template>
  <div class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="/logo-mark.png" alt="" class="w-8 h-8 rounded-md" />
        <span class="font-medium text-white">Lazer Chizma</span>
      </div>

      <div class="bg-panel border border-line rounded-xl p-8 shadow-xl shadow-black/20">
        <h1 class="text-lg font-medium mb-1 text-white">Yangi parol o'rnating</h1>
        <p class="text-text2 text-sm mb-6">Hisobingiz uchun yangi parol kiriting.</p>

        <form @submit.prevent="submit" class="space-y-3">
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            placeholder="Yangi parol"
            class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
          <input
            v-model="password2"
            type="password"
            autocomplete="new-password"
            required
            placeholder="Parolni takrorlang"
            class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
          <button
            type="submit"
            :disabled="sending"
            class="w-full bg-accent hover:bg-accent/90 text-bg font-medium rounded-lg py-2.5 text-sm disabled:opacity-60 transition">
            {{ sending ? "Saqlanmoqda…" : "Parolni saqlash" }}
          </button>
          <p v-if="error" class="text-cutc text-xs bg-cutc/10 border border-cutc/30 rounded-lg px-3 py-2">{{ error }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();
const password = ref("");
const password2 = ref("");
const sending = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  if (password.value !== password2.value) {
    error.value = "Parollar bir xil emas.";
    return;
  }
  sending.value = true;
  try {
    await auth.updatePassword(password.value);
    toast.success("Parol yangilandi.");
    router.push({ name: "projects" });
  } catch (e) {
    error.value = e.message || "Xatolik yuz berdi.";
  } finally {
    sending.value = false;
  }
}
</script>
