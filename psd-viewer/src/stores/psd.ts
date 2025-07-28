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
  canvas?: HTMLCanvasElement  // 重新添加canvas字段
}

export interface PSDFile {
  name: string
  size: number
  width: number
  height: number
  resolution: number
  colorMode: string
  layers: PSDLayer[]
  thumbnail?: string  // 小缩略图 (200x200)
  previewImage?: string  // 高质量预览图 (保持原始尺寸或适当缩放)
  layerChangeTimestamp?: number  // 图层变化时间戳，用于触发UI更新
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
    
    // 深拷贝函数
    const deepCloneLayers = (layers: PSDLayer[]): PSDLayer[] => {
      return layers.map(layer => ({
        ...layer,
        children: layer.children ? deepCloneLayers(layer.children) : undefined
      }))
    }
    
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
    
    // 创建新的layers数组（深拷贝）
    const newLayers = deepCloneLayers(currentFile.value.layers)
    const result = toggleLayer(newLayers)
    
    if (result) {
      // 创建完全新的文件对象以触发响应式更新
      currentFile.value = {
        ...currentFile.value,
        layers: newLayers,
        layerChangeTimestamp: Date.now() // 添加时间戳标记
      }
    }
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