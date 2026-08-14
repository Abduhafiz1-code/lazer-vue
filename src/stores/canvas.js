import { defineStore } from 'pinia'
import { getHandles, moveShape, cloneShape } from '../utils/geometry'

let idCounter = 1
function newId() { return 'sh' + (idCounter++) }

const MAX_HISTORY = 100

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
    guidesOn: true,
    dirty: false,
    clipboard: null,
    history: [],
    historyIndex: -1,
    _suspendHistory: false
  }),
  getters: {
    selectedShape(state) {
      return state.shapes.find(s => s.id === state.selectedId) || null
    },
    canUndo(state) {
      return state.historyIndex > 0
    },
    canRedo(state) {
      return state.historyIndex >= 0 && state.historyIndex < state.history.length - 1
    }
  },
  actions: {
    resetProject(name = 'Chizma 1') {
      this.projectId = null
      this.projectName = name
      this.shapes = []
      this.selectedId = null
      this.dirty = false
      this._resetHistory()
    },
    loadProject(id, name, shapes) {
      this.projectId = id
      this.projectName = name
      this.shapes = shapes || []
      this.selectedId = null
      this.dirty = false
      this._resetHistory()
    },
    setTool(t) {
      this.tool = t
    },
    setLayer(l) {
      this.currentLayer = l
      if (this.selectedId) {
        const sh = this.shapes.find(s => s.id === this.selectedId)
        if (sh) { sh.layer = l; this._commit() }
      }
    },
    addShape(data) {
      data.id = newId()
      this.shapes.push(data)
      this.selectedId = data.id
      this._commit()
    },
    updateShape(id, patch) {
      const sh = this.shapes.find(s => s.id === id)
      if (sh) { Object.assign(sh, patch); this._commit() }
    },
    deleteShape(id) {
      this.shapes = this.shapes.filter(s => s.id !== id)
      if (this.selectedId === id) this.selectedId = null
      this._commit()
    },
    selectShape(id) {
      this.selectedId = id
    },
    snap(v) {
      return this.snapOn ? Math.round(v / this.snapMm) * this.snapMm : v
    },

    // --- Drag / move (no history commit per-frame; call commitDrag() on mouseup) ---
    moveSelectedBy(dx, dy) {
      const sh = this.selectedShape
      if (!sh) return
      moveShape(sh, dx, dy)
      this.dirty = true
    },
    commitDrag() {
      this._commit()
    },

    // --- Productivity features ---
    duplicateSelected() {
      const sh = this.selectedShape
      if (!sh) return
      const copy = cloneShape(sh)
      copy.id = newId()
      const offset = this.snapMm || 5
      moveShape(copy, offset, offset)
      this.shapes.push(copy)
      this.selectedId = copy.id
      this._commit()
    },
    copySelected() {
      const sh = this.selectedShape
      if (!sh) return
      this.clipboard = cloneShape(sh)
    },
    pasteClipboard() {
      if (!this.clipboard) return
      const copy = cloneShape(this.clipboard)
      copy.id = newId()
      const offset = this.snapMm || 5
      moveShape(copy, offset, offset)
      this.shapes.push(copy)
      this.selectedId = copy.id
      this._commit()
    },
    nudgeSelected(dx, dy) {
      const sh = this.selectedShape
      if (!sh) return
      moveShape(sh, dx, dy)
      this._commit()
    },

    // --- History (undo/redo) ---
    _resetHistory() {
      this.history = [JSON.stringify(this.shapes)]
      this.historyIndex = 0
    },
    _commit() {
      this.dirty = true
      if (this._suspendHistory) return
      const snapshot = JSON.stringify(this.shapes)
      if (this.history[this.historyIndex] === snapshot) return
      this.history = this.history.slice(0, this.historyIndex + 1)
      this.history.push(snapshot)
      if (this.history.length > MAX_HISTORY) this.history.shift()
      this.historyIndex = this.history.length - 1
    },
    undo() {
      if (!this.canUndo) return
      this.historyIndex--
      this._suspendHistory = true
      this.shapes = JSON.parse(this.history[this.historyIndex])
      this._suspendHistory = false
      this.dirty = true
      if (this.selectedId && !this.shapes.find(s => s.id === this.selectedId)) this.selectedId = null
    },
    redo() {
      if (!this.canRedo) return
      this.historyIndex++
      this._suspendHistory = true
      this.shapes = JSON.parse(this.history[this.historyIndex])
      this._suspendHistory = false
      this.dirty = true
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
