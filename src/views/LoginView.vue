<template>
  <div class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="/logo-mark.png" alt="" class="w-8 h-8 rounded-md" />
        <span class="font-medium text-white">Lazer Chizma</span>
      </div>

      <div class="bg-panel border border-line rounded-xl p-8 shadow-xl shadow-black/20">
        <h1 class="text-lg font-medium mb-1 text-white">Kirish</h1>
        <p class="text-text2 text-sm mb-6">
          Hisobingizga kirish uchun email va parolni kiriting.
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
                autocomplete="current-password"
                required
                minlength="6"
                placeholder="••••••••"
                class="w-full bg-panel2 border border-line rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-text2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition" />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-text2 hover:text-white text-xs"
                @click="showPw = !showPw">
                {{ showPw ? "Yashirish" : "Ko'rsatish" }}
              </button>
            </div>
          </div>

          <div class="flex justify-end">
            <router-link :to="{ name: 'forgot-password' }" class="text-xs text-text2 hover:text-accent transition">
              Parolni unutdingizmi?
            </router-link>
          </div>

          <button
            type="submit"
            :disabled="sending"
            class="w-full bg-accent hover:bg-accent/90 text-bg font-medium rounded-lg py-2.5 text-sm disabled:opacity-60 transition">
            {{ sending ? "Kirilmoqda…" : "Kirish" }}
          </button>

          <div v-if="error" class="text-cutc text-xs bg-cutc/10 border border-cutc/30 rounded-lg px-3 py-2 leading-relaxed">
            {{ error }}
            <button
              v-if="errorCode === 'email_not_confirmed'"
              type="button"
              class="block mt-1.5 underline hover:text-white"
              :disabled="resending"
              @click="resend">
              {{ resending ? "Yuborilmoqda…" : "Tasdiqlash havolasini qayta yuborish" }}
            </button>
          </div>
        </form>

        <p class="text-center text-xs text-text2 mt-6">
          Hisobingiz yo'qmi?
          <router-link :to="{ name: 'signup' }" class="text-accent hover:underline">Ro'yxatdan o'tish</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();
const email = ref("");
const password = ref("");
const showPw = ref(false);
const sending = ref(false);
const resending = ref(false);
const error = ref("");
const errorCode = ref("");

watchEffect(() => {
  if (auth.user) {
    router.push({ name: "projects" });
  }
});

async function submit() {
  sending.value = true;
  error.value = "";
  errorCode.value = "";
  try {
    await auth.signIn(email.value, password.value);
    toast.success("Xush kelibsiz!");
  } catch (e) {
    error.value = e.message || "Xatolik yuz berdi.";
    errorCode.value = e.code || "";
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
