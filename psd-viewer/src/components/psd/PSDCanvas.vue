<template>
  <div class="psd-canvas-container">
    <div class="canvas-wrapper" ref="canvasWrapper">
      <!-- PSD预览区域 -->
      <div class="canvas-content" v-if="currentFile">
        <!-- 显示动态渲染的预览图 -->
        <div v-if="dynamicPreviewImage" class="psd-preview">
          <img 
            :src="dynamicPreviewImage" 
            :alt="currentFile.name"
            class="psd-image"
            :style="imageStyle"
            @load="handleImageLoad"
          />
        </div>
        
        <!-- 如果动态渲染失败，显示静态预览图 -->
        <div v-else-if="currentFile.previewImage || currentFile.thumbnail" class="psd-preview">
          <img 
            :src="currentFile.previewImage || currentFile.thumbnail" 
            :alt="currentFile.name"
            class="psd-image"
            :style="imageStyle"
            @load="handleImageLoad"
          />
        </div>
        
        <!-- 如果没有预览图，显示基本信息 -->
        <div v-else class="psd-info">
          <div class="info-card">
            <h3 class="file-name">{{ currentFile.name }}</h3>
            <div class="file-stats">
              <div class="stat-item">
                <span class="stat-label">尺寸:</span>
                <span class="stat-value">{{ currentFile.width }} × {{ currentFile.height }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">分辨率:</span>
                <span class="stat-value">{{ currentFile.resolution }} DPI</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">颜色模式:</span>
                <span class="stat-value">{{ currentFile.colorMode }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">图层数:</span>
                <span class="stat-value">{{ currentFile.layers.length }}</span>
              </div>
            </div>
            <div class="canvas-placeholder">
              <el-icon :size="48"><Picture /></el-icon>
              <p>PSD内容预览</p>
              <span class="placeholder-hint">预览图生成中...</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-state">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <p class="loading-text">加载中...</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <el-icon class="error-icon" :size="48"><Warning /></el-icon>
        <p class="error-text">{{ error }}</p>
      </div>
    </div>
    
    <!-- 画布控制工具 -->
    <div class="canvas-controls" v-if="currentFile">
      <div class="zoom-controls">
        <el-button-group>
          <el-button size="small" @click="zoomOut" :disabled="zoomLevel <= minZoom">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button size="small" disabled class="zoom-display">
            {{ Math.round(zoomLevel * 100) }}%
          </el-button>
          <el-button size="small" @click="zoomIn" :disabled="zoomLevel >= maxZoom">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-button size="small" @click="resetZoom" class="reset-btn">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Picture, Loading, Warning, ZoomOut, ZoomIn, Refresh } from '@element-plus/icons-vue'
import { usePSDStore } from '@/stores/psd'
import { useResponsiveLayout } from '@/composables/useResponsive'

// Store和响应式布局
const psdStore = usePSDStore()
const { isMobile, isTablet, isDesktop } = useResponsiveLayout()

// 组件引用
const canvasWrapper = ref<HTMLElement>()

// 状态管理
const zoomLevel = ref(1)
const imageLoaded = ref(false)
const imageNaturalWidth = ref(0)
const imageNaturalHeight = ref(0)
const dynamicPreviewImage = ref<string | null>(null)

// 缩放限制
const minZoom = 0.1
const maxZoom = 5.0
const zoomStep = 0.1

// 计算属性
const currentFile = computed(() => psdStore.currentFile)
const loading = computed(() => psdStore.loading)
const error = computed(() => psdStore.error)

// 动态渲染PSD预览图 (简化版本)
const renderDynamicPreview = () => {
  // 目前直接使用静态预览图，因为ag-psd的图层canvas可能不可用
  // 这是一个基础实现，图层可见性的变化会通过重新解析PSD来实现
  dynamicPreviewImage.value = currentFile.value?.previewImage || null
}

// 图片样式
const imageStyle = computed(() => {
  if (!imageLoaded.value || !imageNaturalWidth.value || !imageNaturalHeight.value) {
    return {}
  }
  
  const containerWidth = isMobile.value ? 300 : isTablet.value ? 500 : 800
  const containerHeight = isMobile.value ? 300 : isTablet.value ? 400 : 600
  
  // 计算适合容器的缩放比例
  const scaleX = containerWidth / imageNaturalWidth.value
  const scaleY = containerHeight / imageNaturalHeight.value
  const baseScale = Math.min(scaleX, scaleY, 1) // 不要放大原始图片
  
  const finalScale = baseScale * zoomLevel.value
  
  return {
    width: `${imageNaturalWidth.value * finalScale}px`,
    height: `${imageNaturalHeight.value * finalScale}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  }
})

// 处理图片加载
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  imageNaturalWidth.value = img.naturalWidth
  imageNaturalHeight.value = img.naturalHeight
  imageLoaded.value = true
}

// 缩放控制
const zoomIn = () => {
  if (zoomLevel.value < maxZoom) {
    zoomLevel.value = Math.min(zoomLevel.value + zoomStep, maxZoom)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > minZoom) {
    zoomLevel.value = Math.max(zoomLevel.value - zoomStep, minZoom)
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
}

// 监听文件变化，重置状态
watch(currentFile, (newFile, oldFile) => {
  if (newFile) {
    zoomLevel.value = 1
    imageLoaded.value = false
    imageNaturalWidth.value = 0
    imageNaturalHeight.value = 0
    
    // 初始渲染
    nextTick(() => {
      renderDynamicPreview()
    })
  } else {
    dynamicPreviewImage.value = null
  }
}, { immediate: true })

// 监听图层变化，重新渲染
watch(() => {
  // 监听图层的可见性变化
  if (!currentFile.value) return null
  
  // 生成一个包含所有图层可见性状态的字符串，用于检测变化
  const getLayerStates = (layers: any[]): string => {
    return layers.map(layer => {
      const state = `${layer.id}:${layer.visible}`
      if (layer.children && layer.children.length > 0) {
        return state + '|' + getLayerStates(layer.children)
      }
      return state
    }).join(',')
  }
  
  return getLayerStates(currentFile.value.layers)
}, () => {
  // 当图层可见性发生变化时，重新渲染
  if (currentFile.value) {
    nextTick(() => {
      renderDynamicPreview()
    })
  }
})

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (!currentFile.value) return
  
  // Ctrl/Cmd + 加号 放大
  if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    zoomIn()
  }
  
  // Ctrl/Cmd + 减号 缩小
  if ((event.ctrlKey || event.metaKey) && event.key === '-') {
    event.preventDefault()
    zoomOut()
  }
  
  // Ctrl/Cmd + 0 重置缩放
  if ((event.ctrlKey || event.metaKey) && event.key === '0') {
    event.preventDefault()
    resetZoom()
  }
}

// 鼠标滚轮缩放
const handleWheel = (event: WheelEvent) => {
  if (!currentFile.value || !(event.ctrlKey || event.metaKey)) return
  
  event.preventDefault()
  
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  canvasWrapper.value?.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  canvasWrapper.value?.removeEventListener('wheel', handleWheel)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.psd-canvas-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #f5f5f5;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  position: relative;
  padding: 16px;
  
  // 自定义滚动条样式
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
}

.canvas-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  width: 100%;
}

.psd-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  
  .psd-image {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: #fff;
    transition: transform 0.2s ease;
    
    // 棋盘背景，用于透明图像
    background-image: 
      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
}

.psd-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 600px;
  
  .info-card {
    background: #fff;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
    width: 100%;
    
    @include respond-below(md) {
      padding: 24px 16px;
      margin: 0 16px;
    }
    
    .file-name {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 24px 0;
      word-break: break-all;
      
      @include respond-below(md) {
        font-size: 18px;
        margin-bottom: 20px;
      }
    }
    
    .file-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
      
      @include respond-below(md) {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 24px;
      }
      
      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        .stat-label {
          font-size: 12px;
          color: #909399;
          font-weight: 500;
        }
        
        .stat-value {
          font-size: 14px;
          color: #303133;
          font-weight: 600;
        }
      }
    }
    
    .canvas-placeholder {
      .el-icon {
        color: #909399;
        margin-bottom: 16px;
      }
      
      p {
        font-size: 16px;
        color: #606266;
        margin: 0 0 8px 0;
        font-weight: 500;
      }
      
      .placeholder-hint {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  
  .loading-icon {
    color: #409eff;
    margin-bottom: 16px;
    animation: rotate 2s linear infinite;
  }
  
  .error-icon {
    color: #f56c6c;
    margin-bottom: 16px;
  }
  
  .loading-text,
  .error-text {
    font-size: 14px;
    color: #606266;
    margin: 0;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.canvas-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  
  @include respond-below(md) {
    bottom: 8px;
    right: 8px;
    left: 8px;
    width: auto;
  }
  
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    
    @include respond-below(md) {
      justify-content: center;
    }
    
    .zoom-display {
      min-width: 60px;
      cursor: default;
      
      &:hover {
        background: #fff;
        border-color: #dcdfe6;
      }
    }
    
    .reset-btn {
      margin-left: 4px;
    }
  }
}
</style>