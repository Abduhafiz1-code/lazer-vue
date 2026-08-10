import { defineStore } from 'pinia'
import { getHandles } from '../utils/geometry'

let idCounter = 1
function newId() { return 'sh' + (idCounter++) }

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    projectId: null,
    projectName: 'Chizma 1',
    shapes: [],
    currentLayer: 'cut',
    tool: 'select',
    selectedId: null,
    scale: 4,
    originX: 60,
    originY: 60,
    gridOn: true,
    snapOn: true,
    snapMm: 1,
    dimOn: true,
    dirty: false
  }),
  getters: {
    selectedShape(state) {
      return state.shapes.find(s => s.id === state.selectedId) || null
    }
  },
  actions: {
    resetProject(name = 'Chizma 1') {
      this.projectId = null
      this.projectName = name
      this.shapes = []
      this.selectedId = null
      this.dirty = false
    },
    loadProject(id, name, shapes) {
      this.projectId = id
      this.projectName = name
      this.shapes = shapes || []
      this.selectedId = null
      this.dirty = false
    },
    setTool(t) {
      this.tool = t
      this.selectedId = this.tool === 'select' ? this.selectedId : this.selectedId
    },
    setLayer(l) {
      this.currentLayer = l
      if (this.selectedId) {
        const sh = this.shapes.find(s => s.id === this.selectedId)
        if (sh) { sh.layer = l; this.dirty = true }
      }
    },
    addShape(data) {
      data.id = newId()
      this.shapes.push(data)
      this.selectedId = data.id
      this.dirty = true
    },
    updateShape(id, patch) {
      const sh = this.shapes.find(s => s.id === id)
      if (sh) { Object.assign(sh, patch); this.dirty = true }
    },
    deleteShape(id) {
      this.shapes = this.shapes.filter(s => s.id !== id)
      if (this.selectedId === id) this.selectedId = null
      this.dirty = true
    },
    selectShape(id) {
      this.selectedId = id
    },
    snap(v) {
      return this.snapOn ? Math.round(v / this.snapMm) * this.snapMm : v
    },
    zoomFit(viewportW, viewportH) {
      if (this.shapes.length === 0) {
        this.scale = 4; this.originX = 60; this.originY = 60
        return
      }
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
      this.shapes.forEach(sh => {
        getHandles(sh).forEach(h => {
          minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x)
          minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y)
        })
        if (sh.type === 'circle') {
          minX = Math.min(minX, sh.cx - sh.r); maxX = Math.max(maxX, sh.cx + sh.r)
          minY = Math.min(minY, sh.cy - sh.r); maxY = Math.max(maxY, sh.cy + sh.r)
        }
      })
      const pad = 40
      const sx = (viewportW - pad * 2) / (maxX - minX || 1)
      const sy = (viewportH - pad * 2) / (maxY - minY || 1)
      this.scale = Math.max(0.5, Math.min(40, Math.min(sx, sy)))
      this.originX = pad - minX * this.scale
      this.originY = pad - minY * this.scale
    }
  }
})
