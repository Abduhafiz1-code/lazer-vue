<template>
  <div class="h-screen flex flex-col bg-bg">
    <div class="flex items-center gap-3 px-3 py-2 bg-panel border-b border-line">
      <button class="text-text2 hover:text-white text-sm" @click="router.push({ name: 'projects' })">← Loyihalar</button>
    </div>
    <Toolbar
      :saving="saving"
      @save="save"
      @delete="deleteSelected"
      @zoom-fit="zoomFit"
      @export-svg="exportSvg"
      @export-dxf="exportDxf"
    />
    <div class="flex flex-1 overflow-hidden">
      <CanvasStage ref="stage" />
      <PropertiesPanel />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from '../stores/canvas'
import { useProjectsStore } from '../stores/projects'
import Toolbar from '../components/Toolbar.vue'
import PropertiesPanel from '../components/PropertiesPanel.vue'
import CanvasStage from '../components/CanvasStage.vue'
import { toSvg, toDxf, download } from '../utils/export'

const route = useRoute()
const router = useRouter()
const store = useCanvasStore()
const projectsStore = useProjectsStore()
const stage = ref(null)
const saving = ref(false)

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      const data = await projectsStore.load(id)
      store.loadProject(data.id, data.name, data.shapes || [])
    } catch (e) {
      alert("Loyihani yuklab bo'lmadi.")
      router.push({ name: 'projects' })
      return
    }
  } else {
    store.resetProject()
  }
  setTimeout(() => stage.value?.zoomFitViewport(), 50)
})

async function save() {
  if (!store.projectId) return
  saving.value = true
  try {
    await projectsStore.save(store.projectId, store.projectName, store.shapes)
    store.dirty = false
  } catch (e) {
    alert('Saqlashda xatolik yuz berdi.')
  } finally {
    saving.value = false
  }
}

function deleteSelected() {
  if (store.selectedId) store.deleteShape(store.selectedId)
}

function zoomFit() {
  stage.value?.zoomFitViewport()
}

function safeName() {
  return (store.projectName || 'chizma').trim().replace(/[^a-zA-Z0-9\-_ ]/g, '') || 'chizma'
}

function exportSvg() {
  download(safeName() + '.svg', toSvg(store.shapes), 'image/svg+xml')
}
function exportDxf() {
  download(safeName() + '.dxf', toDxf(store.shapes), 'application/dxf')
}
</script>
