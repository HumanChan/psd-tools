<template>
  <div class="file-info-container">
    <div v-if="currentFile" class="file-info-content">
      <!-- 文件基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>文件信息</span>
          </div>
        </template>
        
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="文件名">
            <span class="file-name" :title="currentFile.name">
              {{ currentFile.name }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatFileSize(currentFile.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="尺寸">
            {{ currentFile.width }} × {{ currentFile.height }} px
          </el-descriptions-item>
          <el-descriptions-item label="分辨率">
            {{ currentFile.resolution }} DPI
          </el-descriptions-item>
          <el-descriptions-item label="颜色模式">
            <el-tag size="small" type="info">{{ currentFile.colorMode }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 图层统计 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><FolderOpened /></el-icon>
            <span>图层统计</span>
          </div>
        </template>
        
        <div class="layer-stats">
          <div class="stat-item">
            <div class="stat-number">{{ layerCount.total }}</div>
            <div class="stat-label">总图层</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number visible">{{ layerCount.visible }}</div>
            <div class="stat-label">可见</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number hidden">{{ layerCount.hidden }}</div>
            <div class="stat-label">隐藏</div>
          </div>
        </div>
      </el-card>

      <!-- 选中图层信息 -->
      <el-card v-if="selectedLayer" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Select /></el-icon>
            <span>选中图层</span>
          </div>
        </template>
        
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="图层名">
            <span class="layer-name" :title="selectedLayer.name">
              {{ selectedLayer.name }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag 
              size="small" 
              :type="getLayerTypeColor(selectedLayer.type)"
            >
              {{ getLayerTypeText(selectedLayer.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="位置">
            {{ selectedLayer.left }}, {{ selectedLayer.top }}
          </el-descriptions-item>
          <el-descriptions-item label="尺寸">
            {{ selectedLayer.width }} × {{ selectedLayer.height }} px
          </el-descriptions-item>
          <el-descriptions-item label="不透明度">
            <div class="opacity-info">
              <el-progress 
                :percentage="selectedLayer.opacity" 
                :show-text="false"
                :stroke-width="8"
                status="success"
              />
              <span class="opacity-text">{{ selectedLayer.opacity }}%</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="可见性">
            <el-switch 
              :model-value="selectedLayer.visible"
              @change="toggleSelectedLayerVisibility"
              size="small"
            />
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 快捷操作 -->
      <el-card class="info-card actions-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Operation /></el-icon>
            <span>快捷操作</span>
          </div>
        </template>
        
        <div class="actions-content">
          <el-button 
            type="primary" 
            size="small" 
            @click="exportCurrentView"
            :icon="Download"
          >
            导出预览图
          </el-button>
          <el-button 
            size="small" 
            @click="resetView"
            :icon="Refresh"
          >
            重置视图
          </el-button>
          <el-button 
            size="small" 
            @click="clearFile"
            :icon="Delete"
            type="danger"
            plain
          >
            清除文件
          </el-button>
        </div>
      </el-card>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><DocumentDelete /></el-icon>
      <p class="empty-text">暂无文件信息</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Document, 
  FolderOpened, 
  Select, 
  Operation,
  Download,
  Refresh,
  Delete,
  DocumentDelete
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePSDStore } from '@/stores/psd'

// PSD状态管理
const psdStore = usePSDStore()

// 响应式数据 - 从store中获取
const currentFile = computed(() => psdStore.currentFile)
const selectedLayer = computed(() => psdStore.selectedLayer)
const layerCount = computed(() => psdStore.layerCount)

// 方法
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getLayerTypeColor = (type: string): string => {
  const colorMap: { [key: string]: string } = {
    'group': 'info',
    'text': 'success', 
    'effect': 'warning',
    'masked': 'danger',
    'normal': ''
  }
  return colorMap[type] || ''
}

const getLayerTypeText = (type: string): string => {
  const textMap: { [key: string]: string } = {
    'group': '组',
    'text': '文字',
    'effect': '效果',
    'masked': '蒙版',
    'normal': '普通'
  }
  return textMap[type] || type
}

const toggleSelectedLayerVisibility = () => {
  if (selectedLayer.value) {
    psdStore.toggleLayerVisibility(selectedLayer.value.id)
  }
}

const exportCurrentView = () => {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中...')
}

const resetView = () => {
  // TODO: 实现重置视图功能
  ElMessage.info('重置视图功能开发中...')
}

const clearFile = () => {
  psdStore.clearFile()
  ElMessage.success('文件已清除')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.file-info-container {
  height: 100%;
  overflow-y: auto;
  background: #fafafa;
}

.file-info-content {
  padding: 12px;
  
  @include respond-below(md) {
    padding: 8px;
  }
}

.info-card {
  margin-bottom: 12px;
  border-radius: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  :deep(.el-card__header) {
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      
      .el-icon {
        font-size: 16px;
        color: #409eff;
      }
    }
  }
  
  :deep(.el-card__body) {
    padding: 16px;
    
    @include respond-below(md) {
      padding: 12px;
    }
  }
}

.file-name,
.layer-name {
  word-break: break-all;
  line-height: 1.4;
}

.layer-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  
  .stat-item {
    text-align: center;
    flex: 1;
    
    .stat-number {
      font-size: 24px;
      font-weight: 700;
      color: #303133;
      line-height: 1;
      
      &.visible {
        color: #67c23a;
      }
      
      &.hidden {
        color: #f56c6c;
      }
    }
    
    .stat-label {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
  
  .stat-divider {
    width: 1px;
    height: 30px;
    background: #e4e7ed;
    margin: 0 8px;
  }
}

.opacity-info {
  display: flex;
  align-items: center;
  gap: 8px;
  
  :deep(.el-progress) {
    flex: 1;
  }
  
  .opacity-text {
    font-size: 12px;
    color: #606266;
    font-weight: 500;
    white-space: nowrap;
  }
}

.actions-card {
  .actions-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .el-button {
      justify-content: flex-start;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 64px;
    color: #c0c4cc;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

// 响应式适配
@include respond-below(md) {
  .layer-stats {
    .stat-item {
      .stat-number {
        font-size: 20px;
      }
    }
  }
  
  .actions-content {
    .el-button {
      width: 100%;
    }
  }
}
</style>