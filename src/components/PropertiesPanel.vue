<template>
  <div class="w-64 bg-panel border-l border-line p-4 overflow-y-auto text-sm">
    <div class="pb-4 mb-4 border-b border-line">
      <h3 class="label-h">Xossalar</h3>
      <div v-if="!sh" class="text-text2 text-xs leading-relaxed">
        Shaklni tanlash uchun uni bosing, yoki chizishni boshlang.
      </div>
      <div v-else>
        <p class="text-xs text-text2 mb-2">{{ typeLabel(sh.type) }}</p>
        <div v-if="store.suggestionsOn" class="suggestions">
          <strong>Auto tavsiya</strong>
          <span v-if="sh.type === 'rect'"
            >Burchaklarni tekis saqlang yoki kenglik/balandlikni tenglab kvadrat
            qiling.</span
          >
          <span v-else-if="sh.type === 'circle'"
            >Radiusni o'zgartiring, shaklni erkin path'ga aylantirish
            yopiq.</span
          >
          <span v-else-if="sh.type === 'ellipse'"
            >X va Y radiusini alohida o'zgartirib, oval nisbatini
            boshqaring.</span
          >
          <span v-else
            >Markazni siljiting yoki parametr o'lchamini o'zgartiring.</span
          >
        </div>

        <template v-if="sh.type === 'line'">
          <Field
            label="X1 (mm)"
            :model-value="sh.x1"
            @update:model-value="(v) => update('x1', v)" />
          <Field
            label="Y1 (mm)"
            :model-value="sh.y1"
            @update:model-value="(v) => update('y1', v)" />
          <Field
            label="X2 (mm)"
            :model-value="sh.x2"
            @update:model-value="(v) => update('x2', v)" />
          <Field
            label="Y2 (mm)"
            :model-value="sh.y2"
            @update:model-value="(v) => update('y2', v)" />
        </template>
        <template v-else-if="sh.type === 'rect'">
          <Field
            label="X (mm)"
            :model-value="sh.x"
            @update:model-value="(v) => update('x', v)" />
          <Field
            label="Y (mm)"
            :model-value="sh.y"
            @update:model-value="(v) => update('y', v)" />
          <Field
            label="Kenglik (mm)"
            :model-value="sh.w"
            @update:model-value="(v) => update('w', v)" />
          <Field
            label="Balandlik (mm)"
            :model-value="sh.h"
            @update:model-value="(v) => update('h', v)" />
        </template>
        <template v-else-if="sh.type === 'circle'">
          <Field
            label="Markaz X (mm)"
            :model-value="sh.cx"
            @update:model-value="(v) => update('cx', v)" />
          <Field
            label="Markaz Y (mm)"
            :model-value="sh.cy"
            @update:model-value="(v) => update('cy', v)" />
          <Field
            label="Radius (mm)"
            :model-value="sh.r"
            @update:model-value="(v) => update('r', v)" />
        </template>
        <template v-else-if="sh.type === 'ellipse'">
          <Field
            label="Markaz X (mm)"
            :model-value="sh.cx"
            @update:model-value="(v) => update('cx', v)" />
          <Field
            label="Markaz Y (mm)"
            :model-value="sh.cy"
            @update:model-value="(v) => update('cy', v)" />
          <Field
            label="X radius (mm)"
            :model-value="sh.rx"
            @update:model-value="(v) => update('rx', v)" />
          <Field
            label="Y radius (mm)"
            :model-value="sh.ry"
            @update:model-value="(v) => update('ry', v)" />
        </template>
        <template v-else-if="sh.type === 'semicircle'">
          <Field
            label="Markaz X (mm)"
            :model-value="sh.cx"
            @update:model-value="(v) => update('cx', v)" />
          <Field
            label="Markaz Y (mm)"
            :model-value="sh.cy"
            @update:model-value="(v) => update('cy', v)" />
          <Field
            label="Radius (mm)"
            :model-value="sh.r"
            @update:model-value="(v) => update('r', v)" />
        </template>
        <template v-else-if="sh.type === 'semiellipse'">
          <Field
            label="Markaz X (mm)"
            :model-value="sh.cx"
            @update:model-value="(v) => update('cx', v)" />
          <Field
            label="Markaz Y (mm)"
            :model-value="sh.cy"
            @update:model-value="(v) => update('cy', v)" />
          <Field
            label="X radius (mm)"
            :model-value="sh.rx"
            @update:model-value="(v) => update('rx', v)" />
          <Field
            label="Y radius (mm)"
            :model-value="sh.ry"
            @update:model-value="(v) => update('ry', v)" />
        </template>
        <template v-else-if="sh.type === 'polyline' || sh.type === 'path'">
          <div class="row">
            <label class="text-text2 text-xs">Nuqtalar soni</label
            ><span class="text-xs">{{ sh.points.length }}</span>
          </div>
          <div class="row">
            <label class="text-text2 text-xs">Yopish (poligon)</label>
            <input
              type="checkbox"
              :checked="sh.closed"
              @change="update('closed', $event.target.checked)" />
          </div>
          <p class="text-[11px] text-text2 leading-relaxed mt-1">
            Nuqtani torting — shaklni o'zgartiradi. 2 marta bosish — yangi nuqta
            qo'shadi. Alt+bosish — nuqtani o'chiradi.
          </p>
        </template>
        <template v-if="sh.type === 'rect' || sh.type === 'line'">
          <button class="convert-btn" @click="store.convertToPath(sh.id)">
            Erkin nuqtali shaklga aylantirish
          </button>
          <p class="text-[11px] text-text2 leading-relaxed mt-1">
            Shaklni istagancha o'zgartirish (masalan burchaklarini dumaloqlash)
            uchun avval shuni bosing.
          </p>
        </template>
      </div>
    </div>

    <div>
      <h3 class="label-h">Shakllar ({{ store.shapes.length }})</h3>
      <div v-if="store.shapes.length === 0" class="text-text2 text-xs">
        Hali shakl yo'q.
      </div>
      <div
        v-for="s in store.shapes"
        :key="s.id"
        class="flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-panel2 transition"
        :class="
          s.id === store.selectedId ? 'text-white bg-panel2' : 'text-text2'
        "
        @click="store.selectShape(s.id)">
        <span class="flex items-center gap-1.5 truncate">
          <span
            class="w-2 h-2 rounded-full inline-block flex-shrink-0"
            :style="{ background: color(s.layer) }" />
          {{ typeLabel(s.type) }} — {{ desc(s) }}
        </span>
        <span class="text-cutc px-1" @click.stop="store.deleteShape(s.id)"
          >✕</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from "vue";
import { useCanvasStore } from "../stores/canvas";
import { LAYER_COLOR, fmt } from "../utils/geometry";

const store = useCanvasStore();
const sh = computed(() => store.selectedShape);

function update(key, value) {
  if (!sh.value) return;
  const v = typeof value === "boolean" ? value : parseFloat(value) || 0;
  store.updateShape(sh.value.id, { [key]: v });
}

function color(layer) {
  return LAYER_COLOR[layer];
}

function typeLabel(t) {
  return (
    {
      line: "Chiziq",
      rect: "To'rtburchak",
      circle: "Aylana",
      ellipse: "Oval",
      semicircle: "Yarim aylana",
      semiellipse: "Yarim oval",
      polyline: "Chiziq zanjiri",
      path: "Erkin shakl",
    }[t] || t
  );
}

function desc(s) {
  if (s.type === "line")
    return fmt(Math.hypot(s.x2 - s.x1, s.y2 - s.y1)) + " mm";
  if (s.type === "rect") return fmt(s.w) + "×" + fmt(s.h) + " mm";
  if (s.type === "circle") return "r=" + fmt(s.r) + " mm";
  if (s.type === "ellipse")
    return "rx=" + fmt(s.rx) + ", ry=" + fmt(s.ry) + " mm";
  if (s.type === "semicircle") return "r=" + fmt(s.r) + " mm";
  if (s.type === "semiellipse")
    return "rx=" + fmt(s.rx) + ", ry=" + fmt(s.ry) + " mm";
  return s.points.length + " nuqta";
}

const Field = {
  props: ["label", "modelValue"],
  emits: ["update:modelValue"],
  render() {
    return h("div", { class: "row" }, [
      h("label", { class: "text-text2 text-xs" }, this.label),
      h("input", {
        type: "number",
        step: "0.1",
        value: Math.round(this.modelValue * 100) / 100,
        class: "num-input",
        onChange: (e) => this.$emit("update:modelValue", e.target.value),
      }),
    ]);
  },
};
</script>

<style scoped>
.label-h {
  @apply text-xs uppercase tracking-wide text-text2 font-medium mb-2;
}
.convert-btn {
  @apply w-full bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-xs text-white hover:border-accent transition mt-2;
}
.row {
  @apply flex items-center justify-between mb-2 gap-2;
}
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 0 12px;
  padding: 8px;
  border-left: 2px solid #e07a3f;
  background: #292c2f;
  color: #c8cbc5;
  font-size: 11px;
  line-height: 1.4;
}
.suggestions strong {
  color: #e07a3f;
  font-size: 10px;
  text-transform: uppercase;
}
.num-input {
  width: 90px;
  background: #2a2d31;
  border: 1px solid #383b3f;
  color: white;
  padding: 4px 6px;
  border-radius: 5px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  text-align: right;
}
</style>
