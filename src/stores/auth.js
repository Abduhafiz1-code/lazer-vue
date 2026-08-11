import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";

const skipEmailVerification =
  import.meta.env.VITE_DISABLE_EMAIL_VERIFICATION === "true";

function buildDevPassword(email) {
  return `dev-temp-${btoa(email)}`;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: true,
    initialized: false,
    magicLinkSent: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return;
      this.initialized = true;
      const { data } = await supabase.auth.getSession();
      this.user = data.session?.user || null;
      this.loading = false;
      supabase.auth.onAuthStateChange((_event, session) => {
        this.user = session?.user || null;
      });
    },
    async signInWithEmail(email) {
      if (skipEmailVerification) {
        const password = buildDevPassword(email);
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!result.error) {
          this.user = result.data.user || result.data.session?.user || null;
          this.magicLinkSent = false;
          return;
        }

        // Existing user may not have the generated password; fall back to normal OTP login.
        if (result.error.status === 400 || result.error.status === 401) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
          });
          if (otpError) throw otpError;
          this.magicLinkSent = true;
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          if (signUpError.status === 400) {
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: window.location.origin },
            });
            if (otpError) throw otpError;
            this.magicLinkSent = true;
            return;
          }
          throw signUpError;
        }

        const signInResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInResult.error) throw signInResult.error;
        this.user =
          signInResult.data.user || signInResult.data.session?.user || null;
        this.magicLinkSent = false;
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      this.magicLinkSent = true;
    },
    async signOut() {
      await supabase.auth.signOut();
      this.user = null;
    },
  },
});
