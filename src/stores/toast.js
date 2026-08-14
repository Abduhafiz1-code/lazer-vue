import { defineStore } from "pinia";

let idCounter = 1;

export const useToastStore = defineStore("toast", {
  state: () => ({
    items: [],
  }),
  actions: {
    push(message, type = "info", timeout = 4000) {
      const id = idCounter++;
      this.items.push({ id, message, type });
      if (timeout > 0) {
        setTimeout(() => this.dismiss(id), timeout);
      }
      return id;
    },
    success(message, timeout) {
      return this.push(message, "success", timeout);
    },
    error(message, timeout) {
      return this.push(message, "error", timeout ?? 6000);
    },
    info(message, timeout) {
      return this.push(message, "info", timeout);
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
