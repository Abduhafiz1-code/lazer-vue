<template>
  <section v-if="store.suggestionsOn" class="shape-suggest">
    <div class="suggest-head">
      <span class="suggest-kicker">Shape complete</span>
      <span class="suggest-count">{{ suggestions.length }}/3</span>
    </div>
    <input
      v-model="query"
      class="suggest-input"
      placeholder="Shakl bosh harfini yozing..."
      aria-label="Shakl qidirish" />
    <div class="suggest-grid">
      <button
        v-for="item in suggestions"
        :key="item.id"
        class="shape-option"
        :title="`${item.label} ni qo'shish`"
        @click="store.addPresetShape(item.id)">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <polygon :points="preview(item.id)" />
        </svg>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { useCanvasStore } from "../stores/canvas";
import { presetPoints, SHAPE_PRESETS } from "../utils/geometry";

const store = useCanvasStore();
const query = ref("");
const previewCache = new Map();

const suggestions = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  const source = needle
    ? SHAPE_PRESETS.filter(
        (item) =>
          item.label.toLocaleLowerCase().startsWith(needle) ||
          item.id.startsWith(needle),
      )
    : recommended.value;
  return source.slice(0, 3);
});

const recommended = computed(() => {
  const type = store.selectedShape?.type;
  const preferred =
    type === "rect"
      ? ["bracket", "gear", "arch"]
      : type === "line"
        ? ["bolt", "arrow", "shield"]
        : ["gear", "cloud", "arch"];
  return preferred
    .map((id) => SHAPE_PRESETS.find((item) => item.id === id))
    .filter(Boolean);
});

function preview(id) {
  if (!previewCache.has(id)) {
    previewCache.set(
      id,
      presetPoints(50, 50, 36, id)
        .map(([x, y]) => `${x},${y}`)
        .join(" "),
    );
  }
  return previewCache.get(id);
}
</script>

<style scoped>
.shape-suggest {
  margin: 0 0 14px;
  padding: 9px;
  border: 1px solid #45494d;
  background: #25282b;
}
.suggest-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
}
.suggest-kicker {
  color: #e07a3f;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.suggest-count {
  color: #777d7a;
  font:
    10px ui-monospace,
    monospace;
}
.suggest-input {
  width: 100%;
  margin-bottom: 8px;
  padding: 6px 7px;
  border: 1px solid #45494d;
  border-radius: 3px;
  background: #181a1c;
  font-size: 11px;
  outline: none;
}
.suggest-input:focus {
  border-color: #e07a3f;
}
.suggest-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.shape-option {
  min-width: 0;
  border: 1px solid #3b3f43;
  border-radius: 3px;
  background: #1b1d1f;
  color: #c9ccc7;
  padding: 4px;
  cursor: pointer;
}
.shape-option:hover {
  border-color: #e07a3f;
  color: white;
  background: #2d3033;
}
.shape-option svg {
  display: block;
  width: 100%;
  height: 43px;
}
.shape-option polygon {
  fill: rgba(224, 122, 63, 0.12);
  stroke: #e07a3f;
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.shape-option span {
  display: block;
  overflow: hidden;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
