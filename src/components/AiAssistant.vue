<template>
  <aside class="ai-panel">
    <div class="ai-head">
      <div>
        <p class="eyebrow">AI yordamchi</p>
        <h2>Chizma suhbatdoshi</h2>
      </div>
      <button
        class="icon-btn"
        title="AI panelini yopish"
        @click="$emit('close')">
        ×
      </button>
    </div>
    <div ref="messagesEl" class="messages">
      <div v-if="messages.length === 0" class="empty">
        Masalan: “Yulduz chizib ber” yoki “Tanlangan shaklni ikki qismga bo'l”.
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="message.role">
        {{ message.content }}
      </div>
      <div v-if="loading" class="message assistant">AI o'ylayapti...</div>
    </div>
    <form class="composer" @submit.prevent="send">
      <textarea
        v-model="prompt"
        rows="2"
        placeholder="Shakl yoki o'zgarish yozing..."
        :disabled="loading" />
      <button class="send" :disabled="loading || !prompt.trim()">
        Yuborish
      </button>
    </form>
  </aside>
</template>

<script setup>
import { nextTick, ref } from "vue";
import { supabase } from "../lib/supabase";
import { useCanvasStore } from "../stores/canvas";

const emit = defineEmits(["close"]);
const store = useCanvasStore();
const prompt = ref("");
const loading = ref(false);
const messages = ref([]);
const messagesEl = ref(null);
let messageId = 1;

async function send() {
  const content = prompt.value.trim();
  if (!content || loading.value) return;
  messages.value.push({ id: messageId++, role: "user", content });
  prompt.value = "";
  loading.value = true;
  try {
    const { data, error } = await supabase.functions.invoke("AI_Function", {
      body: {
        message: content,
        shapes: store.shapes,
        selectedShape: store.selectedShape,
      },
    });
    if (error) throw error;
    if (data?.shapes?.length) {
      data.shapes.forEach((shape) =>
        store.addShape({ ...shape, layer: shape.layer || store.currentLayer }),
      );
    }
    messages.value.push({
      id: messageId++,
      role: "assistant",
      content: data?.message || "Bajarildi.",
    });
  } catch (error) {
    messages.value.push({
      id: messageId++,
      role: "assistant",
      content:
        "AI ulanishida xatolik. Supabase AI_Function sozlamalarini tekshiring.",
    });
  } finally {
    loading.value = false;
    await nextTick();
    messagesEl.value?.scrollTo({
      top: messagesEl.value.scrollHeight,
      behavior: "smooth",
    });
  }
}
</script>

<style scoped>
.ai-panel {
  width: 310px;
  display: flex;
  flex-direction: column;
  background: #202326;
  border-left: 1px solid #383b3f;
  color: #f2f2f0;
}
.ai-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #383b3f;
}
.eyebrow {
  margin: 0 0 3px;
  color: #e07a3f;
  font:
    10px ui-monospace,
    monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
h2 {
  margin: 0;
  font:
    600 16px Georgia,
    serif;
}
.icon-btn {
  border: 0;
  background: transparent;
  color: #a7aaa6;
  font-size: 22px;
  cursor: pointer;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}
.empty {
  color: #888c88;
  font-size: 12px;
  line-height: 1.5;
}
.message {
  max-width: 92%;
  margin: 0 0 10px;
  padding: 9px 11px;
  border-radius: 5px;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.message.user {
  margin-left: auto;
  background: #31404a;
}
.message.assistant {
  background: #2a2d31;
  color: #d4d6d1;
}
.composer {
  padding: 12px;
  border-top: 1px solid #383b3f;
}
textarea {
  width: 100%;
  border: 1px solid #45494d;
  border-radius: 4px;
  background: #181a1c;
  padding: 8px;
  font-size: 12px;
  outline: none;
}
textarea:focus {
  border-color: #e07a3f;
}
.send {
  width: 100%;
  margin-top: 7px;
  border: 1px solid #e07a3f;
  border-radius: 4px;
  background: #e07a3f;
  color: #171819;
  padding: 8px;
  font-size: 12px;
  cursor: pointer;
}
.send:disabled {
  opacity: 0.45;
  cursor: default;
}
@media (max-width: 800px) {
  .ai-panel {
    position: absolute;
    z-index: 20;
    right: 0;
    top: 42px;
    bottom: 0;
    width: min(310px, 92vw);
  }
}
</style>
