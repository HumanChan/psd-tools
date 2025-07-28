<template>
  <div class="file-info-container" :class="{ 'mobile-info': isMobile }">
    <!-- 头部标题 -->
    <div class="info-header">
      <div class="header-title">
        <el-icon><Document /></el-icon>
        <span>文件信息</span>
      </div>
      
      <div v-if="!isMobile" class="header-actions">
        <el-button
          :icon="Refresh"
          size="small"
          circle
          @click="refreshInfo"
          title="刷新信息"
        />
      </div>
    </div>

    <!-- 文件信息内容 -->
    <div v-if="psdData" class="info-content">
      <!-- 文件基本信息 -->
      <div class="info-section">
        <div class="section-title">基本信息</div>
        <el-descriptions
          :column="isMobile ? 1 : 2"
          size="small"
          border
        >
          <el-descriptions-item label="文件名">
            <div class="file-name" :title="psdData.name">
              {{ psdData.name }}
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="文件大小">
            <div class="file-size">
              {{ formatFileSize(psdData.fileSize) }}
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="文件类型">
            <el-tag size="small" type="primary">
              {{ psdData.metadata.fileType }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="PSD版本">
            <el-tag size="small">
              v{{ psdData.metadata.version }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 画布信息 -->
      <div class="info-section">
        <div class="section-title">
          <el-icon><PictureFilled /></el-icon>
          画布信息
        </div>
        <el-descriptions
          :column="isMobile ? 1 : 2"
          size="small"
          border
        >
          <el-descriptions-item label="尺寸">
            <div class="canvas-size">
              {{ psdData.width }} × {{ psdData.height }} px
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="分辨率">
            <div class="resolution">
              {{ psdData.resolution }} DPI
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="颜色模式">
            <el-tag size="small" :type="getColorModeType(psdData.colorMode)">
              {{ getColorModeText(psdData.colorMode) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="位深度">
            <div class="bit-depth">
              {{ psdData.bitsPerChannel }} bit/通道
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="通道数">
            <div class="channels">
              {{ psdData.channels }} 个通道
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="透明度">
            <el-tag 
              size="small" 
              :type="psdData.metadata.hasTransparency ? 'success' : 'info'"
            >
              {{ psdData.metadata.hasTransparency ? '支持' : '不支持' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 图层统计 -->
      <div class="info-section">
        <div class="section-title">
          <el-icon><Menu /></el-icon>
          图层统计
        </div>
        <el-descriptions
          :column="isMobile ? 1 : 2"
          size="small"
          border
        >
          <el-descriptions-item label="图层总数">
            <div class="layer-count">
              {{ psdData.metadata.layerCount }} 个
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="可见图层">
            <div class="visible-layers">
              {{ visibleLayerCount }} 个
            </div>
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 图层类型统计 -->
        <div v-if="layerTypeStats" class="layer-type-stats">
          <div class="stats-title">图层类型分布</div>
          <div class="stats-grid">
            <div
              v-for="(count, type) in layerTypeStats"
              :key="type"
              class="stat-item"
            >
              <el-icon :class="getLayerTypeIconClass(type)">
                <component :is="getLayerTypeIcon(type)" />
              </el-icon>
              <span class="stat-label">{{ getLayerTypeText(type) }}</span>
              <span class="stat-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术信息 (非移动端显示) -->
      <div v-if="!isMobile" class="info-section">
        <div class="section-title">
          <el-icon><Setting /></el-icon>
          技术信息
        </div>
        <el-descriptions column="1" size="small" border>
          <el-descriptions-item label="创建时间">
            <div class="create-time">
              {{ formatDate(psdData.metadata.createTime) }}
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="内存占用">
            <div class="memory-usage">
              {{ calculateMemoryUsage() }}
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="解析状态">
            <el-tag size="small" type="success">
              解析成功
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 快捷操作 -->
      <div class="info-actions">
        <el-button-group>
          <el-button
            size="small"
            :icon="Download"
            @click="exportInfo"
          >
            {{ isMobile ? '导出' : '导出信息' }}
          </el-button>
          
          <el-button
            size="small"
            :icon="CopyDocument"
            @click="copyInfo"
          >
            {{ isMobile ? '复制' : '复制信息' }}
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <div class="empty-text">暂无文件信息</div>
      <div class="empty-subtitle">请先上传PSD文件</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document, PictureFilled, Menu, Setting, Refresh,
  Download, CopyDocument, Folder, EditPen, Picture
} from '@element-plus/icons-vue'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import type { PSDData, LayerData } from '@/types/psd'

// Props
interface FileInfoProps {
  psdData?: PSDData | null
  visibleLayers?: string[]
}

const props = withDefaults(defineProps<FileInfoProps>(), {
  psdData: null,
  visibleLayers: () => []
})

// Emits
const emit = defineEmits<{
  export: [type: string]
  copy: []
}>()

// Composables
const { isMobile } = useResponsiveLayout()

// Computed
const visibleLayerCount = computed(() => {
  if (!props.psdData?.layers) return 0
  return countVisibleLayers(props.psdData.layers)
})

const layerTypeStats = computed(() => {
  if (!props.psdData?.layers) return null
  
  const stats: Record<string, number> = {}
  
  const countTypes = (layers: LayerData[]) => {
    for (const layer of layers) {
      stats[layer.type] = (stats[layer.type] || 0) + 1
      if (layer.children) {
        countTypes(layer.children)
      }
    }
  }
  
  countTypes(props.psdData.layers)
  return stats
})

// Methods
const countVisibleLayers = (layers: LayerData[]): number => {
  let count = 0
  for (const layer of layers) {
    if (layer.visible) count++
    if (layer.children) {
      count += countVisibleLayers(layer.children)
    }
  }
  return count
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getColorModeText = (mode: number): string => {
  const colorModes: Record<number, string> = {
    0: 'Bitmap',
    1: 'Grayscale',
    2: 'Indexed',
    3: 'RGB',
    4: 'CMYK',
    7: 'Multichannel',
    8: 'Duotone',
    9: 'Lab'
  }
  return colorModes[mode] || `Unknown(${mode})`
}

const getColorModeType = (mode: number): string => {
  if (mode === 3) return 'success' // RGB
  if (mode === 4) return 'warning' // CMYK
  if (mode === 1) return 'info' // Grayscale
  return 'default'
}

const getLayerTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'group': '组',
    'text': '文本',
    'shape': '形状',
    'image': '图像'
  }
  return typeMap[type] || type
}

const getLayerTypeIcon = (type: string) => {
  switch (type) {
    case 'group':
      return Folder
    case 'text':
      return EditPen
    case 'shape':
      return Document
    default:
      return Picture
  }
}

const getLayerTypeIconClass = (type: string) => {
  return {
    'type-icon': true,
    'type-group': type === 'group',
    'type-text': type === 'text',
    'type-shape': type === 'shape',
    'type-image': type === 'image'
  }
}

const calculateMemoryUsage = (): string => {
  if (!props.psdData) return '0 MB'
  
  // 估算内存占用 = 宽 × 高 × 通道数 × 位深度 / 8
  const pixelCount = props.psdData.width * props.psdData.height
  const bytesPerPixel = props.psdData.channels * (props.psdData.bitsPerChannel / 8)
  const memoryBytes = pixelCount * bytesPerPixel
  
  return formatFileSize(memoryBytes)
}

const refreshInfo = () => {
  ElMessage.success('信息已刷新')
}

const exportInfo = () => {
  if (!props.psdData) return
  
  const info = {
    filename: props.psdData.name,
    fileSize: formatFileSize(props.psdData.fileSize),
    dimensions: `${props.psdData.width} × ${props.psdData.height}`,
    resolution: `${props.psdData.resolution} DPI`,
    colorMode: getColorModeText(props.psdData.colorMode),
    bitsPerChannel: props.psdData.bitsPerChannel,
    layerCount: props.psdData.metadata.layerCount,
    visibleLayers: visibleLayerCount.value,
    hasTransparency: props.psdData.metadata.hasTransparency,
    createTime: formatDate(props.psdData.metadata.createTime)
  }
  
  // 创建并下载JSON文件
  const blob = new Blob([JSON.stringify(info, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.psdData.name.replace('.psd', '')}_info.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件信息已导出')
  emit('export', 'json')
}

const copyInfo = async () => {
  if (!props.psdData) return
  
  const infoText = `
文件名: ${props.psdData.name}
文件大小: ${formatFileSize(props.psdData.fileSize)}
画布尺寸: ${props.psdData.width} × ${props.psdData.height} px
分辨率: ${props.psdData.resolution} DPI
颜色模式: ${getColorModeText(props.psdData.colorMode)}
位深度: ${props.psdData.bitsPerChannel} bit/通道
图层总数: ${props.psdData.metadata.layerCount}
可见图层: ${visibleLayerCount.value}
透明度支持: ${props.psdData.metadata.hasTransparency ? '是' : '否'}
创建时间: ${formatDate(props.psdData.metadata.createTime)}
  `.trim()
  
  try {
    await navigator.clipboard.writeText(infoText)
    ElMessage.success('信息已复制到剪贴板')
    emit('copy')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style lang="scss" scoped>
.file-info-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;

  &.mobile-info {
    border: none;
    border-radius: 0;
  }
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.info-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .mobile-info & {
    padding: 12px;
  }
}

.info-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 16px;
  }

  .mobile-info & {
    margin-bottom: 20px;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-light);

  .mobile-info & {
    font-size: 13px;
    margin-bottom: 10px;
  }
}

.file-name {
  font-weight: 500;
  word-break: break-all;
}

.file-size {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.canvas-size {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-weight: 500;
}

.layer-type-stats {
  margin-top: 12px;

  .stats-title {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 8px;

    .mobile-info & {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
    font-size: 12px;

    .stat-label {
      flex: 1;
      color: var(--el-text-color-secondary);
    }

    .stat-count {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }
}

.type-icon {
  font-size: 14px;

  &.type-group {
    color: var(--el-color-warning);
  }

  &.type-text {
    color: var(--el-color-primary);
  }

  &.type-shape {
    color: var(--el-color-success);
  }

  &.type-image {
    color: var(--el-text-color-secondary);
  }
}

.info-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);

  .mobile-info & {
    margin-top: 12px;
    padding-top: 12px;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  padding: 40px 20px;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .empty-subtitle {
    font-size: 14px;
    color: var(--el-text-color-disabled);
  }
}

// 响应式优化
@media (max-width: 768px) {
  .info-content {
    padding: 10px;
  }

  .section-title {
    font-size: 13px;
  }

  :deep(.el-descriptions__label) {
    font-size: 12px;
  }

  :deep(.el-descriptions__content) {
    font-size: 12px;
  }
}

// 描述列表样式优化
:deep(.el-descriptions) {
  .el-descriptions__label {
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }

  .el-descriptions__content {
    color: var(--el-text-color-primary);
  }
}
</style>