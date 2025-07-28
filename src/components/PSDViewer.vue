<template>
  <div class="psd-viewer-container" ref="containerRef">
    <div v-if="!psdData" class="empty-state">
      <el-icon :size="60" class="empty-icon">
        <Picture />
      </el-icon>
      <div class="empty-text">请先上传PSD文件</div>
    </div>
    
    <div v-else class="viewer-wrapper">
      <!-- Canvas容器 -->
      <div class="canvas-container" ref="canvasContainerRef">
        <canvas
          ref="canvasRef"
          class="psd-canvas"
          :style="canvasStyle"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @wheel="handleWheel"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @contextmenu.prevent
        />
        
        <!-- 加载状态覆盖层 -->
        <div v-if="loading" class="loading-overlay">
          <el-icon class="loading-icon">
            <Loading />
          </el-icon>
          <div class="loading-text">正在渲染...</div>
        </div>
      </div>
      
      <!-- 工具栏 -->
      <div class="viewer-toolbar" :class="{ 'mobile-toolbar': isMobile }">
        <div class="toolbar-left">
          <el-button-group>
            <el-button
              :icon="ZoomIn"
              size="small"
              @click="zoomIn"
              :disabled="scale >= maxScale"
            />
            <el-button
              :icon="ZoomOut"
              size="small"
              @click="zoomOut"
              :disabled="scale <= minScale"
            />
          </el-button-group>
          
          <el-button
            size="small"
            @click="resetView"
            class="reset-btn"
          >
            {{ isMobile ? '重置' : '适应窗口' }}
          </el-button>
          
          <el-button
            size="small"
            @click="actualSize"
          >
            {{ isMobile ? '1:1' : '实际大小' }}
          </el-button>
        </div>
        
        <div class="toolbar-right">
          <span class="scale-text">{{ Math.round(scale * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Loading, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import type { PSDData, LayerData } from '@/types/psd'

// Props
interface PSDViewerProps {
  psdData?: PSDData | null
  visibleLayers?: string[]
}

const props = withDefaults(defineProps<PSDViewerProps>(), {
  psdData: null,
  visibleLayers: () => []
})

// Emits
const emit = defineEmits<{
  layerClick: [layer: LayerData]
  scaleChange: [scale: number]
  positionChange: [x: number, y: number]
}>()

// Composables
const { isMobile } = useResponsiveLayout()

// Refs
const containerRef = ref<HTMLElement>()
const canvasContainerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

// State
const loading = ref(false)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

// Constants
const minScale = 0.1
const maxScale = 10
const zoomStep = 0.2

// Computed
const canvasStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
  transformOrigin: 'center center',
  transition: isDragging.value ? 'none' : 'transform 0.2s ease'
}))

// Methods
const initCanvas = async () => {
  console.log('🎨 [DEBUG-CANVAS] 初始化Canvas开始')
  
  if (!props.psdData || !canvasRef.value) {
    console.warn('⚠️ [DEBUG-CANVAS] 缺少必要数据:', {
      hasPsdData: !!props.psdData,
      hasCanvasRef: !!canvasRef.value
    })
    return
  }

  console.log('🔍 [DEBUG-CANVAS] Canvas初始化数据:', {
    psdName: props.psdData.name,
    dimensions: `${props.psdData.width}x${props.psdData.height}`,
    hasCompositeImage: !!props.psdData.compositeImage,
    hasCompositeImageData: !!props.psdData.compositeImageData,
    layerCount: props.psdData.layers.length
  })

  loading.value = true
  
  try {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取Canvas上下文')

    console.log('📐 [DEBUG-CANVAS] 设置Canvas尺寸:', `${props.psdData.width}x${props.psdData.height}`)
    // 设置Canvas尺寸
    canvas.width = props.psdData.width
    canvas.height = props.psdData.height

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 如果有合成图像，优先使用
    if (props.psdData.compositeImage) {
      console.log('🖼️ [DEBUG-CANVAS] 使用合成图像渲染')
      ctx.drawImage(props.psdData.compositeImage, 0, 0)
    } else if (props.psdData.compositeImageData) {
      console.log('🗃️ [DEBUG-CANVAS] 使用合成图像数据渲染')
      // 如果有合成图像数据，创建临时canvas
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx && props.psdData.compositeImageData) {
        tempCanvas.width = props.psdData.width
        tempCanvas.height = props.psdData.height
        tempCtx.putImageData(props.psdData.compositeImageData, 0, 0)
        ctx.drawImage(tempCanvas, 0, 0)
      }
    } else if (props.psdData.layers && props.psdData.layers.length > 0) {
      console.log('🏗️ [DEBUG-CANVAS] 使用图层渲染，图层数量:', props.psdData.layers.length)
      // 如果没有合成图像，逐层渲染
      await renderLayers(ctx, props.psdData.layers)
    } else {
      console.log('❓ [DEBUG-CANVAS] 无图像数据，显示占位符')
      // 如果没有任何图像数据，显示占位符
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#999'
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PSD预览', canvas.width / 2, canvas.height / 2)
      ctx.fillText('(图像数据不可用)', canvas.width / 2, canvas.height / 2 + 30)
    }

    console.log('🔄 [DEBUG-CANVAS] 调整视图适应窗口')
    // 适应窗口大小
    await nextTick()
    resetView()
    
    console.log('✅ [DEBUG-CANVAS] Canvas初始化完成')
    
  } catch (error) {
    console.error('❌ [DEBUG-CANVAS] Canvas初始化失败:', error)
    ElMessage.error('图像渲染失败: ' + (error instanceof Error ? error.message : ''))
  } finally {
    loading.value = false
  }
}

const renderLayers = async (ctx: CanvasRenderingContext2D, layers: LayerData[]) => {
  console.log(`🏗️ [DEBUG-RENDER] 开始渲染 ${layers.length} 个图层`)
  // 按照从下到上的顺序渲染图层（数组顺序通常是从上到下）
  const reversedLayers = [...layers].reverse()
  
  for (const layer of reversedLayers) {
    console.log(`🎨 [DEBUG-RENDER] 渲染图层: ${layer.name}`)
    await renderSingleLayer(ctx, layer)
  }
  
  console.log(`✅ [DEBUG-RENDER] 图层渲染完成`)
}

const renderSingleLayer = async (ctx: CanvasRenderingContext2D, layer: LayerData) => {
  console.log(`🔍 [DEBUG-LAYER] 处理单个图层: ${layer.name}`, {
    type: layer.type,
    visible: layer.visible,
    hasCanvas: !!layer.canvas,
    hasImageData: !!layer.imageData,
    bounds: layer.bounds
  })
  
  // 检查图层是否可见
  if (!layer.visible) {
    console.log(`👁️‍🗨️ [DEBUG-LAYER] 图层不可见，跳过: ${layer.name}`)
    return
  }
  
  // 检查是否在visibleLayers列表中（如果有指定）
  if (props.visibleLayers && props.visibleLayers.length > 0) {
    if (!props.visibleLayers.includes(layer.id)) {
      console.log(`🚫 [DEBUG-LAYER] 图层不在可见列表中，跳过: ${layer.name}`)
      return
    }
  }

  // 保存当前画布状态
  ctx.save()

  try {
    // 设置图层透明度
    ctx.globalAlpha = layer.opacity

    // 设置混合模式
    ctx.globalCompositeOperation = getBlendMode(layer.blendMode)

    // 设置图层裁剪区域（如果有）
    if (layer.bounds.width > 0 && layer.bounds.height > 0) {
      ctx.beginPath()
      ctx.rect(
        layer.bounds.left,
        layer.bounds.top,
        layer.bounds.width,
        layer.bounds.height
      )
      ctx.clip()
    }

    console.log(`🎭 [DEBUG-LAYER] 渲染图层类型: ${layer.type}`)
    
    // 根据图层类型进行不同的渲染
    switch (layer.type) {
      case 'image':
        await renderImageLayer(ctx, layer)
        break
      case 'text':
        await renderTextLayer(ctx, layer)
        break
      case 'shape':
        await renderShapeLayer(ctx, layer)
        break
      case 'group':
        await renderGroupLayer(ctx, layer)
        break
      default:
        console.log(`❓ [DEBUG-LAYER] 未知图层类型，按图像层处理: ${layer.type}`)
        await renderImageLayer(ctx, layer) // 默认按图像层处理
    }

    // 递归渲染子图层
    if (layer.children && layer.children.length > 0) {
      console.log(`👶 [DEBUG-LAYER] 渲染 ${layer.children.length} 个子图层`)
      await renderLayers(ctx, layer.children)
    }

  } catch (error) {
    console.warn(`⚠️ [DEBUG-LAYER] 渲染图层 ${layer.name} 时出错:`, error)
  } finally {
    // 恢复画布状态
    ctx.restore()
    console.log(`✅ [DEBUG-LAYER] 图层渲染完成: ${layer.name}`)
  }
}

const renderImageLayer = async (ctx: CanvasRenderingContext2D, layer: LayerData) => {
  if (layer.canvas) {
    // 如果有canvas，直接绘制
    ctx.drawImage(
      layer.canvas,
      layer.bounds.left,
      layer.bounds.top,
      layer.bounds.width,
      layer.bounds.height
    )
  } else if (layer.imageData) {
    // 如果有imageData，创建临时canvas
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (tempCtx) {
      tempCanvas.width = layer.bounds.width
      tempCanvas.height = layer.bounds.height
      tempCtx.putImageData(layer.imageData, 0, 0)
      
      ctx.drawImage(
        tempCanvas,
        layer.bounds.left,
        layer.bounds.top
      )
    }
  } else {
    // 如果没有图像数据，绘制占位符
    console.log(`图层 ${layer.name} 没有图像数据，绘制占位符`)
    
    ctx.save()
    ctx.fillStyle = `rgba(200, 200, 200, ${layer.opacity * 0.3})`
    ctx.strokeStyle = `rgba(150, 150, 150, ${layer.opacity})`
    ctx.lineWidth = 1
    
    // 绘制矩形占位符
    if (layer.bounds.width > 0 && layer.bounds.height > 0) {
      ctx.fillRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      ctx.strokeRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      
      // 添加图层名称
      if (layer.bounds.width > 100 && layer.bounds.height > 30) {
        ctx.fillStyle = `rgba(100, 100, 100, ${layer.opacity})`
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(
          layer.name,
          layer.bounds.left + layer.bounds.width / 2,
          layer.bounds.top + layer.bounds.height / 2
        )
      }
    }
    
    ctx.restore()
  }
}

const renderTextLayer = async (ctx: CanvasRenderingContext2D, layer: LayerData) => {
  // 文本图层的渲染逻辑
  if (layer.canvas) {
    ctx.drawImage(
      layer.canvas,
      layer.bounds.left,
      layer.bounds.top
    )
  } else {
    // 如果没有预渲染的canvas，绘制文本占位符
    console.log(`文本图层 ${layer.name} 没有canvas数据，绘制占位符`)
    
    ctx.save()
    ctx.fillStyle = `rgba(100, 150, 255, ${layer.opacity * 0.3})`
    ctx.strokeStyle = `rgba(50, 100, 200, ${layer.opacity})`
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    
    if (layer.bounds.width > 0 && layer.bounds.height > 0) {
      ctx.fillRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      ctx.strokeRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      
      // 添加文本标识
      ctx.fillStyle = `rgba(50, 100, 200, ${layer.opacity})`
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.setLineDash([])
      ctx.fillText(
        '📝 ' + layer.name,
        layer.bounds.left + layer.bounds.width / 2,
        layer.bounds.top + layer.bounds.height / 2
      )
    }
    
    ctx.restore()
  }
}

const renderShapeLayer = async (ctx: CanvasRenderingContext2D, layer: LayerData) => {
  // 形状图层的渲染逻辑
  if (layer.canvas) {
    ctx.drawImage(
      layer.canvas,
      layer.bounds.left,
      layer.bounds.top
    )
  } else {
    // 如果没有预渲染的canvas，绘制形状占位符
    console.log(`形状图层 ${layer.name} 没有canvas数据，绘制占位符`)
    
    ctx.save()
    ctx.fillStyle = `rgba(100, 255, 150, ${layer.opacity * 0.3})`
    ctx.strokeStyle = `rgba(50, 200, 100, ${layer.opacity})`
    ctx.lineWidth = 2
    
    if (layer.bounds.width > 0 && layer.bounds.height > 0) {
      ctx.fillRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      ctx.strokeRect(layer.bounds.left, layer.bounds.top, layer.bounds.width, layer.bounds.height)
      
      // 添加形状标识
      ctx.fillStyle = `rgba(50, 200, 100, ${layer.opacity})`
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(
        '🔷 ' + layer.name,
        layer.bounds.left + layer.bounds.width / 2,
        layer.bounds.top + layer.bounds.height / 2
      )
    }
    
    ctx.restore()
  }
}

const renderGroupLayer = async (ctx: CanvasRenderingContext2D, layer: LayerData) => {
  // 图层组的渲染逻辑
  // 图层组本身通常不需要渲染，只需要递归渲染子图层
  if (layer.canvas) {
    // 如果图层组有合成图像，先渲染它
    ctx.drawImage(
      layer.canvas,
      layer.bounds.left,
      layer.bounds.top
    )
  }
}

const getBlendMode = (blendMode: string): GlobalCompositeOperation => {
  const blendModeMap: Record<string, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'soft-light': 'soft-light',
    'hard-light': 'hard-light',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'darken': 'darken',
    'lighten': 'lighten',
    'difference': 'difference',
    'exclusion': 'exclusion'
  }
  
  return blendModeMap[blendMode] || 'source-over'
}

// 缩放和平移
const zoomIn = () => {
  if (scale.value < maxScale) {
    const newScale = Math.min(scale.value + zoomStep, maxScale)
    setScale(newScale)
  }
}

const zoomOut = () => {
  if (scale.value > minScale) {
    const newScale = Math.max(scale.value - zoomStep, minScale)
    setScale(newScale)
  }
}

const setScale = (newScale: number) => {
  scale.value = newScale
  emit('scaleChange', newScale)
}

const resetView = () => {
  if (!props.psdData || !canvasContainerRef.value) return

  const container = canvasContainerRef.value
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  const scaleX = containerWidth / props.psdData.width
  const scaleY = containerHeight / props.psdData.height
  const newScale = Math.min(scaleX, scaleY, 1) * 0.9 // 留10%边距

  scale.value = newScale
  offsetX.value = 0
  offsetY.value = 0
  
  emit('scaleChange', newScale)
  emit('positionChange', 0, 0)
}

const actualSize = () => {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  
  emit('scaleChange', 1)
  emit('positionChange', 0, 0)
}

// 鼠标事件处理
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) { // 左键拖拽
    isDragging.value = true
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
    event.preventDefault()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const deltaX = event.clientX - lastMouseX.value
    const deltaY = event.clientY - lastMouseY.value
    
    offsetX.value += deltaX
    offsetY.value += deltaY
    
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
    
    emit('positionChange', offsetX.value, offsetY.value)
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? -zoomStep : zoomStep
  const newScale = Math.max(minScale, Math.min(maxScale, scale.value + delta))
  
  if (newScale !== scale.value) {
    setScale(newScale)
  }
}

// 触摸事件处理（移动端）
let lastTouchDistance = 0
let lastTouchCenterX = 0
let lastTouchCenterY = 0

const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault()
  
  if (event.touches.length === 1) {
    // 单指拖拽
    isDragging.value = true
    lastMouseX.value = event.touches[0].clientX
    lastMouseY.value = event.touches[0].clientY
  } else if (event.touches.length === 2) {
    // 双指缩放
    isDragging.value = false
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    
    lastTouchDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
    
    lastTouchCenterX = (touch1.clientX + touch2.clientX) / 2
    lastTouchCenterY = (touch1.clientY + touch2.clientY) / 2
  }
}

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault()
  
  if (event.touches.length === 1 && isDragging.value) {
    // 单指拖拽
    const deltaX = event.touches[0].clientX - lastMouseX.value
    const deltaY = event.touches[0].clientY - lastMouseY.value
    
    offsetX.value += deltaX
    offsetY.value += deltaY
    
    lastMouseX.value = event.touches[0].clientX
    lastMouseY.value = event.touches[0].clientY
    
    emit('positionChange', offsetX.value, offsetY.value)
  } else if (event.touches.length === 2) {
    // 双指缩放
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
    
    if (lastTouchDistance > 0) {
      const scaleChange = currentDistance / lastTouchDistance
      const newScale = Math.max(minScale, Math.min(maxScale, scale.value * scaleChange))
      setScale(newScale)
    }
    
    lastTouchDistance = currentDistance
  }
}

const handleTouchEnd = () => {
  isDragging.value = false
  lastTouchDistance = 0
}

// 窗口大小变化处理
const handleResize = () => {
  // 延迟执行，确保DOM更新完成
  setTimeout(() => {
    if (props.psdData) {
      resetView()
    }
  }, 100)
}

// 监听器
watch(() => props.psdData, (newData) => {
  console.log('🔄 PSDViewer接收到新的PSD数据:', newData)
  if (newData) {
    console.log('📊 PSD数据详情:', {
      name: newData.name,
      dimensions: `${newData.width}x${newData.height}`,
      hasCompositeImage: !!newData.compositeImage,
      hasCompositeImageData: !!newData.compositeImageData,
      layerCount: newData.layers.length
    })
    nextTick(() => {
      console.log('🚀 准备初始化Canvas...')
      initCanvas()
    })
  }
}, { deep: true })

watch(() => props.visibleLayers, () => {
  if (props.psdData) {
    initCanvas()
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('mouseup', handleMouseUp)
  
  if (props.psdData) {
    nextTick(() => {
      initCanvas()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style lang="scss" scoped>
.psd-viewer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-lighter);
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 16px;
  }
}

.viewer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  background: 
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.psd-canvas {
  max-width: none;
  max-height: none;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .loading-icon {
    font-size: 32px;
    margin-bottom: 8px;
    animation: rotate 1s linear infinite;
  }

  .loading-text {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);
  
  &.mobile-toolbar {
    padding: 8px 12px;
    
    .el-button {
      padding: 6px 8px;
      font-size: 12px;
    }
  }
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
}

.toolbar-right {
  .scale-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    min-width: 50px;
    text-align: right;
    
    @media (max-width: 480px) {
      font-size: 12px;
      min-width: 40px;
    }
  }
}

.reset-btn {
  @media (max-width: 480px) {
    display: none;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>