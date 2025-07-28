<template>
  <div class="psd-canvas-container">
    <div class="canvas-wrapper" ref="canvasWrapper">
      <!-- PSD预览区域 -->
      <div class="canvas-content" v-if="currentFile">
        <!-- 显示预览图 -->
        <div v-if="dynamicPreviewImage || currentFile.previewImage || currentFile.thumbnail" class="psd-preview">
          <img 
            :src="dynamicPreviewImage || currentFile.previewImage || currentFile.thumbnail" 
            :alt="currentFile.name"
            class="psd-image"
            :class="{ 'layer-modified': layerStateChanged }"
            :style="imageStyle"
            @load="handleImageLoad"
          />
          
          <!-- 图层可见性变化提示 -->
          <div v-if="layerStateChanged" class="layer-change-overlay">
            <div class="change-message">
              <el-icon class="change-icon"><Refresh /></el-icon>
              <div class="change-content">
                <p>图层状态已改变</p>
                <span class="change-hint" v-if="dynamicPreviewImage">预览图已更新</span>
                <span class="change-hint" v-else>动态渲染中...</span>
              </div>
            </div>
          </div>
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
const layerStateChanged = ref(false)
const layerChangeTimestamp = ref(0) // 使用时间戳来跟踪变化
const dynamicPreviewImage = ref<string | null>(null) // 动态生成的预览图

// 缩放限制
const minZoom = 0.1
const maxZoom = 5.0
const zoomStep = 0.1

// 计算属性
const currentFile = computed(() => psdStore.currentFile)
const loading = computed(() => psdStore.loading)
const error = computed(() => psdStore.error)

// 动态重新合成预览图
const regeneratePreview = () => {
  if (!currentFile.value) {
    dynamicPreviewImage.value = null
    return
  }

  console.log('开始重新合成预览图')

  try {
    // 创建画布
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = currentFile.value.width
    canvas.height = currentFile.value.height

    // 清除画布（设置透明背景）
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 递归渲染所有可见图层
    const renderLayers = (layers: any[]) => {
      layers.forEach(layer => {
        if (layer.visible && layer.canvas) {
          try {
            console.log(`渲染图层: ${layer.name}, 位置: ${layer.left}, ${layer.top}`)
            
            // 设置透明度
            const alpha = (layer.opacity || 100) / 100
            const previousAlpha = ctx.globalAlpha
            ctx.globalAlpha = previousAlpha * alpha

            // 绘制图层
            ctx.drawImage(layer.canvas, layer.left, layer.top)

            // 恢复透明度
            ctx.globalAlpha = previousAlpha
          } catch (error) {
            console.warn(`渲染图层失败: ${layer.name}`, error)
          }
        } else if (layer.visible) {
          console.log(`图层 ${layer.name} 可见但没有canvas数据`)
        }

        // 递归处理子图层
        if (layer.children && layer.children.length > 0) {
          renderLayers(layer.children)
        }
      })
    }

    renderLayers(currentFile.value.layers)

    // 生成高质量预览图
    const maxSize = 2048
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1)
    
    if (scale < 1) {
      const previewCanvas = document.createElement('canvas')
      const previewCtx = previewCanvas.getContext('2d')
      if (!previewCtx) return
      
      previewCanvas.width = Math.floor(canvas.width * scale)
      previewCanvas.height = Math.floor(canvas.height * scale)
      
      previewCtx.imageSmoothingEnabled = true
      previewCtx.imageSmoothingQuality = 'high'
      
      previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height)
      dynamicPreviewImage.value = previewCanvas.toDataURL('image/png')
    } else {
      dynamicPreviewImage.value = canvas.toDataURL('image/png')
    }

    console.log('预览图重新合成完成')
  } catch (error) {
    console.warn('重新合成预览图失败:', error)
    dynamicPreviewImage.value = null
  }
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
    const newZoom = Math.min(zoomLevel.value + zoomStep, maxZoom)
    console.log('放大缩放:', zoomLevel.value, '->', newZoom)
    zoomLevel.value = newZoom
  } else {
    console.log('已达到最大缩放级别')
  }
}

const zoomOut = () => {
  if (zoomLevel.value > minZoom) {
    const newZoom = Math.max(zoomLevel.value - zoomStep, minZoom)
    console.log('缩小缩放:', zoomLevel.value, '->', newZoom)
    zoomLevel.value = newZoom
  } else {
    console.log('已达到最小缩放级别')
  }
}

const resetZoom = () => {
  console.log('重置缩放:', zoomLevel.value, '-> 1')
  zoomLevel.value = 1
}

// 监听文件变化，重置状态（但要区分是新文件还是图层变化）
watch(currentFile, (newFile, oldFile) => {
  if (newFile && (!oldFile || newFile.name !== oldFile.name)) {
    // 只有在真正切换文件时才重置状态
    zoomLevel.value = 1
    imageLoaded.value = false
    imageNaturalWidth.value = 0
    imageNaturalHeight.value = 0
    layerStateChanged.value = false
    layerChangeTimestamp.value = 0
  }
}, { immediate: true })

// 监听图层变化时间戳
watch(() => currentFile.value?.layerChangeTimestamp, (newTimestamp) => {
  if (newTimestamp && newTimestamp > layerChangeTimestamp.value) {
    layerStateChanged.value = true
    layerChangeTimestamp.value = newTimestamp
    
    // 重新生成预览图
    regeneratePreview()
    
    // 3秒后自动隐藏提示
    setTimeout(() => {
      layerStateChanged.value = false
    }, 3000)
  }
})

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  console.log('键盘事件:', event.key, event.ctrlKey, event.metaKey)
  
  if (!currentFile.value) {
    console.log('没有当前文件，忽略键盘事件')
    return
  }
  
  // Ctrl/Cmd + 加号 放大
  if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    console.log('放大')
    zoomIn()
  }
  
  // Ctrl/Cmd + 减号 缩小
  if ((event.ctrlKey || event.metaKey) && event.key === '-') {
    event.preventDefault()
    console.log('缩小')
    zoomOut()
  }
  
  // Ctrl/Cmd + 0 重置缩放
  if ((event.ctrlKey || event.metaKey) && event.key === '0') {
    event.preventDefault()
    console.log('重置缩放')
    resetZoom()
  }
}

// 鼠标滚轮缩放
const handleWheel = (event: WheelEvent) => {
  console.log('滚轮事件:', event.deltaY, event.ctrlKey, event.metaKey)
  
  if (!currentFile.value || !(event.ctrlKey || event.metaKey)) {
    console.log('滚轮缩放条件不满足')
    return
  }
  
  event.preventDefault()
  
  if (event.deltaY < 0) {
    console.log('滚轮放大')
    zoomIn()
  } else {
    console.log('滚轮缩小')
    zoomOut()
  }
}

// 生命周期
onMounted(() => {
  setupEventListeners()
})

onUnmounted(() => {
  cleanupEventListeners()
})

// 事件监听器管理
const setupEventListeners = () => {
  document.addEventListener('keydown', handleKeydown)
  canvasWrapper.value?.addEventListener('wheel', handleWheel, { passive: false })
}

const cleanupEventListeners = () => {
  document.removeEventListener('keydown', handleKeydown)
  canvasWrapper.value?.removeEventListener('wheel', handleWheel)
}

// 监听currentFile变化，重新设置事件监听器（仅在文件切换时）
watch(() => currentFile.value?.name, (newName, oldName) => {
  if (newName && newName !== oldName) {
    // 确保事件监听器正常工作
    nextTick(() => {
      cleanupEventListeners()
      setupEventListeners()
    })
  }
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
  position: relative;  /* 添加相对定位以支持绝对定位的提示层 */
  
  .psd-image {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: #fff;
    transition: transform 0.2s ease, opacity 0.3s ease, filter 0.3s ease;
    
    // 棋盘背景，用于透明图像
    background-image: 
      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    
    &.layer-modified {
      opacity: 0.85;
      filter: brightness(0.95) contrast(0.95);
      border: 2px solid #409eff;
    }
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

.layer-change-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  z-index: 10;
  max-width: 280px;
  
  .change-message {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    
    .change-icon {
      font-size: 18px;
      color: #409eff;
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .change-content {
      flex: 1;
      
      p {
        margin: 0 0 6px 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .change-hint {
        font-size: 12px;
        color: #ccc;
        line-height: 1.4;
      }
    }
  }
}
</style>