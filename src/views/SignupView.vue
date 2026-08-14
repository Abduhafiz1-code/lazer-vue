<template>
  <div class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="/logo-mark.png" alt="" class="w-8 h-8 rounded-md" />
        <span class="font-medium text-white">Lazer Chizma</span>
      </div>

      <div class="bg-panel border border-line rounded-xl p-8 shadow-xl shadow-black/20">
        <template v-if="!sent">
          <h1 class="text-lg font-medium mb-1 text-white">Ro'yxatdan o'tish</h1>
          <p class="text-text2 text-sm mb-6">
            Yangi hisob yarating. Ro'yxatdan o'tgach emailingizga tasdiqlash havolasi yuboriladi.
          </p>

          <form @submit.prevent="submit" class="space-y-3">
            <div>
              <label class="block text-xs text-text2 mb-1">Email</label>
              <input
                v-model.trim="email"
                type="email"
                autocomplete="email"
                required
                placeholder="email@misol.com"
                class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
            </div>
            <div>
              <label class="block text-xs text-text2 mb-1">Parol</label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPw ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  placeholder="Kamida 6 ta belgi"
                  class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-text2 hover:text-white text-xs"
                  @click="showPw = !showPw">
                  {{ showPw ? "Yashirish" : "Ko'rsatish" }}
                </button>
              </div>
              <p class="text-[11px] mt-1" :class="strengthColor">{{ strengthLabel }}</p>
            </div>
            <div>
              <label class="block text-xs text-text2 mb-1">Parolni takrorlang</label>
              <input
                v-model="password2"
                :type="showPw ? 'text' : 'password'"
                autocomplete="new-password"
                required
                placeholder="••••••••"
                class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
            </div>

            <button
              type="submit"
              :disabled="sending"
              class="w-full bg-accent hover:bg-accent/90 text-bg font-medium rounded-lg py-2.5 text-sm disabled:opacity-60 transition">
              {{ sending ? "Yaratilmoqda…" : "Hisob yaratish" }}
            </button>

            <p v-if="error" class="text-cutc text-xs bg-cutc/10 border border-cutc/30 rounded-lg px-3 py-2 leading-relaxed">
              {{ error }}
            </p>
          </form>

          <p class="text-center text-xs text-text2 mt-6">
            Hisobingiz bormi?
            <router-link :to="{ name: 'login' }" class="text-accent hover:underline">Kirish</router-link>
          </p>
        </template>

        <template v-else>
          <div class="text-center py-2">
            <div class="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4 text-xl">✉</div>
            <h1 class="text-lg font-medium mb-2 text-white">Emailingizni tasdiqlang</h1>
            <p class="text-text2 text-sm leading-relaxed mb-6">
              <span class="text-white">{{ email }}</span> manziliga tasdiqlash havolasi yuborildi.
              Havolani bosgach tizimga kirishingiz mumkin bo'ladi.
            </p>
            <button
              class="text-xs text-accent hover:underline disabled:opacity-60 disabled:no-underline"
              :disabled="resending"
              @click="resend">
              {{ resending ? "Yuborilmoqda…" : "Xat kelmadimi? Qayta yuborish" }}
            </button>
            <router-link :to="{ name: 'login' }" class="block text-xs text-text2 hover:text-white mt-4">
              ← Kirish sahifasiga qaytish
            </router-link>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();
const email = ref("");
const password = ref("");
const password2 = ref("");
const showPw = ref(false);
const sending = ref(false);
const resending = ref(false);
const error = ref("");
const sent = ref(false);

const strengthLabel = computed(() => {
  const p = password.value;
  if (!p) return "";
  if (p.length < 6) return "Juda qisqa";
  if (p.length < 10) return "O'rtacha kuchli parol";
  return "Kuchli parol";
});
const strengthColor = computed(() => {
  const p = password.value;
  if (!p || p.length < 6) return "text-cutc";
  if (p.length < 10) return "text-markc";
  return "text-accent";
});

async function submit() {
  error.value = "";
  if (password.value !== password2.value) {
    error.value = "Parollar bir xil emas.";
    return;
  }
  sending.value = true;
  try {
    const { needsConfirmation } = await auth.signUp(email.value, password.value);
    if (needsConfirmation) {
      sent.value = true;
    } else {
      toast.success("Hisob yaratildi. Xush kelibsiz!");
    }
  } catch (e) {
    error.value = e.message || "Xatolik yuz berdi.";
  } finally {
    sending.value = false;
  }
}

async function resend() {
  resending.value = true;
  try {
    await auth.resendConfirmation(email.value);
    toast.success("Tasdiqlash havolasi qayta yuborildi.");
  } catch (e) {
    toast.error(e.message || "Yuborishda xatolik yuz berdi.");
  } finally {
    resending.value = false;
  }
}
</script>
