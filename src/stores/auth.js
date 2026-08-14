import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";

const emailRedirectTo =
  import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin;

function friendlyError(error) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("email not confirmed")) {
    const e = new Error(
      "Email hali tasdiqlanmagan. Pochtangizni tekshiring va tasdiqlash havolasini bosing."
    );
    e.code = "email_not_confirmed";
    return e;
  }
  if (msg.includes("invalid login credentials")) {
    return new Error("Email yoki parol noto'g'ri.");
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return new Error("Bu email bilan hisob allaqachon mavjud. Kirishga urinib ko'ring.");
  }
  if (msg.includes("password should be at least")) {
    return new Error("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
  }
  return error;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: true,
    initialized: false,
    passwordRecovery: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return;
      this.initialized = true;
      const { data } = await supabase.auth.getSession();
      this.user = data.session?.user || null;
      this.loading = false;
      supabase.auth.onAuthStateChange((event, session) => {
        this.user = session?.user || null;
        if (event === "PASSWORD_RECOVERY") this.passwordRecovery = true;
      });
    },

    // Returns { needsConfirmation: boolean }
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw friendlyError(error);
      // Supabase returns a fake user with an empty identities array when the
      // email is already registered but unconfirmed re-signup is blocked.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("Bu email bilan hisob allaqachon mavjud. Kirishga urinib ko'ring.");
      }
      if (data.session) {
        this.user = data.user;
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw friendlyError(error);
      this.user = data.user;
    },

    async resendConfirmation(email) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      if (error) throw friendlyError(error);
    },

    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: emailRedirectTo,
      });
      if (error) throw friendlyError(error);
    },

    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw friendlyError(error);
      this.passwordRecovery = false;
    },

    async signOut() {
      await supabase.auth.signOut();
      this.user = null;
    },
  },
});
