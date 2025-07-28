import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PSDLayer {
  id: string
  name: string
  type: string
  visible: boolean
  opacity: number
  left: number
  top: number
  width: number
  height: number
  children?: PSDLayer[]
  thumbnail?: string
}

export interface PSDFile {
  name: string
  size: number
  width: number
  height: number
  resolution: number
  colorMode: string
  layers: PSDLayer[]
  thumbnail?: string
}

export const usePSDStore = defineStore('psd', () => {
  // 状态
  const currentFile = ref<PSDFile | null>(null)
  const selectedLayerId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 计算属性
  const selectedLayer = computed(() => {
    if (!currentFile.value || !selectedLayerId.value) return null
    
    const findLayer = (layers: PSDLayer[]): PSDLayer | null => {
      for (const layer of layers) {
        if (layer.id === selectedLayerId.value) return layer
        if (layer.children) {
          const found = findLayer(layer.children)
          if (found) return found
        }
      }
      return null
    }
    
    return findLayer(currentFile.value.layers)
  })
  
  const layerCount = computed(() => {
    if (!currentFile.value) return { total: 0, visible: 0, hidden: 0 }
    
    const countLayers = (layers: PSDLayer[]): { total: number, visible: number, hidden: number } => {
      let total = 0
      let visible = 0
      let hidden = 0
      
      for (const layer of layers) {
        total++
        if (layer.visible) visible++
        else hidden++
        
        if (layer.children) {
          const childCount = countLayers(layer.children)
          total += childCount.total
          visible += childCount.visible
          hidden += childCount.hidden
        }
      }
      
      return { total, visible, hidden }
    }
    
    return countLayers(currentFile.value.layers)
  })
  
  // 方法
  const setCurrentFile = (file: PSDFile) => {
    currentFile.value = file
    selectedLayerId.value = null
    error.value = null
  }
  
  const selectLayer = (layerId: string) => {
    selectedLayerId.value = layerId
  }
  
  const toggleLayerVisibility = (layerId: string) => {
    if (!currentFile.value) return
    
    const toggleLayer = (layers: PSDLayer[]): boolean => {
      for (const layer of layers) {
        if (layer.id === layerId) {
          layer.visible = !layer.visible
          return true
        }
        if (layer.children && toggleLayer(layer.children)) {
          return true
        }
      }
      return false
    }
    
    toggleLayer(currentFile.value.layers)
  }
  
  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }
  
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }
  
  const clearFile = () => {
    currentFile.value = null
    selectedLayerId.value = null
    error.value = null
    loading.value = false
  }
  
  return {
    // 状态
    currentFile,
    selectedLayerId,
    loading,
    error,
    
    // 计算属性
    selectedLayer,
    layerCount,
    
    // 方法
    setCurrentFile,
    selectLayer,
    toggleLayerVisibility,
    setLoading,
    setError,
    clearFile
  }
})