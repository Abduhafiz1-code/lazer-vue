<template>
  <div
    class="flex items-center gap-2 px-3 py-2 bg-panel border-b border-line flex-wrap">
    <input
      v-model="store.projectName"
      type="text"
      class="bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-sm w-44 text-white focus:outline-none focus:border-accent transition" />
    <button @click="$emit('save')" class="btn" :disabled="saving">
      {{ saving ? "Saqlanmoqda…" : store.dirty ? "Saqlash" : "Saqlandi ✓" }}
    </button>
    <div class="sep" />

    <button
      class="tool"
      title="Ortga qaytarish (Ctrl+Z)"
      :disabled="!store.canUndo"
      @click="store.undo()">
      ↶
    </button>
    <button
      class="tool"
      title="Qaytarish (Ctrl+Shift+Z)"
      :disabled="!store.canRedo"
      @click="store.redo()">
      ↷
    </button>
    <div class="sep" />

    <button
      v-for="t in tools"
      :key="t.id"
      class="tool"
      :class="{ 'tool-active': store.tool === t.id }"
      :title="t.label"
      @click="store.setTool(t.id)">
      {{ t.icon }}
    </button>

    <div v-if="store.tool === 'polygon'" class="flex items-center gap-1.5 pl-1">
      <span class="text-[11px] text-text2">Burchaklar:</span>
      <input
        type="number"
        min="3"
        max="20"
        v-model.number="store.polygonSides"
        class="bg-panel2 border border-line rounded-md px-1.5 py-1 text-xs text-white w-12" />
    </div>
    <select
      v-if="store.tool === 'preset'"
      v-model="store.presetShape"
      class="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs text-white max-w-40">
      <option v-for="shape in presets" :key="shape.id" :value="shape.id">
        {{ shape.label }}
      </option>
    </select>

    <button
      class="tool"
      title="Nusxalash (Ctrl+D)"
      :disabled="!store.selectedShape"
      @click="store.duplicateSelected()">
      ⧉
    </button>
    <button
      class="tool"
      title="Shaklni ikkiga bo'lish"
      :disabled="!store.selectedShape"
      @click="store.splitSelected()">
      ⫽
    </button>
    <button
      v-if="
        store.selectedShape &&
        (store.selectedShape.type === 'rect' ||
          store.selectedShape.type === 'circle' ||
          store.selectedShape.type === 'line')
      "
      class="tool"
      title="Erkin nuqtali shaklga aylantirish (istagancha shaklini o'zgartirish uchun)"
      @click="store.convertToPath(store.selectedId)">
      ⌁
    </button>
    <button
      class="tool"
      title="O'chirish (Delete)"
      :disabled="!store.selectedShape"
      @click="$emit('delete')">
      ✕
    </button>
    <button
      class="tool"
      title="Barchasini ko'rsatish"
      @click="$emit('zoom-fit')">
      ⤢
    </button>
    <div class="sep" />

    <button
      v-for="l in layers"
      :key="l.id"
      class="layer-btn"
      :class="{ 'layer-active': store.currentLayer === l.id }"
      @click="store.setLayer(l.id)">
      <span
        class="w-2.5 h-2.5 rounded-full inline-block"
        :style="{ background: l.color }" />
      {{ l.label }}
    </button>
    <div class="sep" />

    <label class="chk"
      ><input type="checkbox" v-model="store.gridOn" /> Setka</label
    >
    <label class="chk"
      ><input type="checkbox" v-model="store.snapOn" /> Ilashish</label
    >
    <select
      v-model="store.unit"
      title="O'lchov birligi"
      class="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs text-white">
      <option value="mm">mm</option>
      <option value="cm">cm</option>
      <option value="mt">mt (1 metr)</option>
    </select>
    <select
      v-model.number="snapValue"
      class="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs text-white">
      <option :value="0.1">0.1 {{ store.unit }}</option>
      <option :value="0.5">0.5 {{ store.unit }}</option>
      <option :value="1">1 {{ store.unit }}</option>
      <option :value="5">5 {{ store.unit }}</option>
      <option :value="10">10 {{ store.unit }}</option>
    </select>
    <label class="chk"
      ><input type="checkbox" v-model="store.dimOn" /> O'lchamlar</label
    >
    <label class="chk"
      ><input type="checkbox" v-model="store.guidesOn" /> Masofa
      chiziqlari</label
    >
    <label class="chk"
      ><input type="checkbox" v-model="store.suggestionsOn" /> Auto
      tavsiya</label
    >
    <div class="sep" />

    <button class="btn" @click="$emit('export-svg')">SVG</button>
    <button class="btn" @click="$emit('export-dxf')">DXF</button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useCanvasStore } from "../stores/canvas";
import { SHAPE_PRESETS, unitFactor } from "../utils/geometry";

defineProps({ saving: Boolean });
defineEmits(["save", "delete", "zoom-fit", "export-svg", "export-dxf"]);

const store = useCanvasStore();
const snapValue = computed({
  get: () => store.snapMm / unitFactor(store.unit),
  set: (value) => {
    store.snapMm = Number(value) * unitFactor(store.unit);
  },
});

const tools = [
  { id: "select", icon: "◆", label: "Belgilash (V)" },
  { id: "line", icon: "╱", label: "Chiziq (L)" },
  { id: "rect", icon: "▭", label: "To'rtburchak (R)" },
  { id: "circle", icon: "◯", label: "Aylana (C)" },
  { id: "ellipse", icon: "⬭", label: "Oval (O)" },
  { id: "semicircle", icon: "◔", label: "Yarim aylana (S)" },
  { id: "polyline", icon: "∠", label: "Erkin chiziq (P)" },
  { id: "polygon", icon: "⬡", label: "Ko'p qirrali shakl (G)" },
  { id: "preset", icon: "✦", label: "20 ta tayyor shakl" },
  {
    id: "eraser",
    icon: "⌫",
    label: "Yo'q qilish chizig'i — boshlab chizilgan masofani o'chiradi (E)",
  },
  { id: "pan", icon: "✥", label: "Surish (Space)" },
];

const presets = SHAPE_PRESETS;

const layers = [
  { id: "cut", color: "#e0413f", label: "Kesish" },
  { id: "engrave", color: "#3f8fe0", label: "Gravировка" },
  { id: "mark", color: "#e0d13f", label: "Belgilash" },
];
</script>

<style scoped>
.btn {
  @apply bg-panel2 border border-line rounded-md px-3 py-1.5 text-xs text-white hover:border-accent disabled:opacity-40 disabled:hover:border-line transition;
}
.tool {
  @apply w-8 h-8 rounded-md border border-transparent text-text2 hover:bg-panel2 hover:text-white text-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text2 transition;
}
.tool-active {
  @apply bg-accent text-bg;
}
.layer-btn {
  @apply flex items-center gap-1.5 border border-line rounded-md px-2.5 py-1.5 text-xs text-text2 hover:border-accent/60 transition;
}
.layer-active {
  @apply border-accent text-white;
}
.sep {
  @apply w-px h-6 bg-line mx-1;
}
.chk {
  @apply flex items-center gap-1.5 text-xs text-text2;
}
</style>
