<template>
  <div class="layer-tree-container">
    <!-- 图层搜索 -->
    <div class="layer-search" v-if="layers.length > 0">
      <el-input
        v-model="searchQuery"
        placeholder="搜索图层..."
        :prefix-icon="Search"
        clearable
        size="small"
      />
    </div>

    <!-- 图层树 -->
    <div class="layer-tree-content">
      <el-tree
        v-if="filteredLayers.length > 0"
        ref="treeRef"
        :data="filteredLayers"
        :props="treeProps"
        node-key="id"
        :default-expanded-keys="expandedKeys"
        :show-checkbox="false"
        :highlight-current="true"
        @node-click="handleNodeClick"
        class="layer-tree"
      >
        <template #default="{ node, data }">
          <div class="layer-node" :class="{ 'layer-selected': data.id === selectedLayerId }">
            <!-- 图层可见性切换 -->
            <el-icon 
              class="layer-visibility"
              :class="{ 'layer-hidden': !data.visible }"
              @click.stop="toggleLayerVisibility(data.id)"
            >
              <View v-if="data.visible" />
              <Hide v-else />
            </el-icon>

            <!-- 图层缩略图 -->
            <div class="layer-thumbnail">
              <img 
                v-if="data.thumbnail" 
                :src="data.thumbnail" 
                :alt="data.name"
                class="thumbnail-image"
              />
              <el-icon v-else class="thumbnail-placeholder">
                <Document />
              </el-icon>
            </div>

            <!-- 图层信息 -->
            <div class="layer-info">
              <span class="layer-name" :title="data.name">{{ data.name }}</span>
              <div class="layer-details">
                <el-tag 
                  :type="getLayerTypeColor(data.type)" 
                  size="small"
                  class="layer-type-tag"
                >
                  {{ getLayerTypeText(data.type) }}
                </el-tag>
                <span class="layer-size">{{ data.width }}×{{ data.height }}</span>
              </div>
            </div>

            <!-- 图层不透明度 -->
            <div class="layer-opacity" v-if="data.opacity < 100">
              <span class="opacity-text">{{ data.opacity }}%</span>
            </div>
          </div>
        </template>
      </el-tree>

      <!-- 空状态 -->
      <div v-else-if="layers.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Folder /></el-icon>
        <p class="empty-text">暂无图层数据</p>
      </div>

      <!-- 搜索无结果 -->
      <div v-else class="empty-state">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p class="empty-text">未找到匹配的图层</p>
        <el-button text type="primary" @click="clearSearch">清除搜索</el-button>
      </div>
    </div>

    <!-- 图层统计信息 -->
    <div class="layer-stats" v-if="layers.length > 0">
      <el-divider />
      <div class="stats-content">
        <div class="stat-item">
          <span class="stat-label">总图层:</span>
          <span class="stat-value">{{ layerCount.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">可见:</span>
          <span class="stat-value">{{ layerCount.visible }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">隐藏:</span>
          <span class="stat-value">{{ layerCount.hidden }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Search, View, Hide, Document, Folder } from '@element-plus/icons-vue'
import { ElTree } from 'element-plus'
import { usePSDStore } from '@/stores/psd'
import type { PSDLayer } from '@/stores/psd'

// PSD状态管理
const psdStore = usePSDStore()

// 响应式数据 - 从store中获取
const currentFile = computed(() => psdStore.currentFile)
const selectedLayerId = computed(() => psdStore.selectedLayerId)
const layerCount = computed(() => psdStore.layerCount)

// 组件引用
const treeRef = ref<InstanceType<typeof ElTree>>()

// 响应式数据
const searchQuery = ref('')
const expandedKeys = ref<string[]>([])

// 计算属性
const layers = computed(() => {
  const result = currentFile.value?.layers || []
  console.log('LayerTree - currentFile:', currentFile.value)
  console.log('LayerTree - layers:', result)
  return result
})

const filteredLayers = computed(() => {
  if (!searchQuery.value.trim()) {
    return layers.value
  }
  
  return filterLayersBySearch(layers.value, searchQuery.value.toLowerCase())
})

// 树组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 方法
const handleNodeClick = (data: PSDLayer) => {
  psdStore.selectLayer(data.id)
}

const toggleLayerVisibility = (layerId: string) => {
  psdStore.toggleLayerVisibility(layerId)
}

const clearSearch = () => {
  searchQuery.value = ''
}

// 根据搜索关键词过滤图层
const filterLayersBySearch = (layers: PSDLayer[], query: string): PSDLayer[] => {
  const result: PSDLayer[] = []
  
  for (const layer of layers) {
    const matchesName = layer.name.toLowerCase().includes(query)
    const matchesType = getLayerTypeText(layer.type).toLowerCase().includes(query)
    
    let filteredChildren: PSDLayer[] = []
    if (layer.children) {
      filteredChildren = filterLayersBySearch(layer.children, query)
    }
    
    if (matchesName || matchesType || filteredChildren.length > 0) {
      result.push({
        ...layer,
        children: filteredChildren.length > 0 ? filteredChildren : layer.children
      })
    }
  }
  
  return result
}

// 获取图层类型颜色
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

// 获取图层类型文本
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

// 初始化展开状态
const initializeExpandedKeys = () => {
  const keys: string[] = []
  
  const collectGroupKeys = (layers: PSDLayer[]) => {
    for (const layer of layers) {
      if (layer.children && layer.children.length > 0) {
        keys.push(layer.id)
        collectGroupKeys(layer.children)
      }
    }
  }
  
  collectGroupKeys(layers.value)
  expandedKeys.value = keys
}

// 监听图层数据变化
watch(layers, (newLayers) => {
  if (newLayers.length > 0) {
    nextTick(() => {
      initializeExpandedKeys()
    })
  }
}, { immediate: true })

// 监听搜索变化，展开搜索结果
watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    // 搜索时展开所有匹配的节点
    const keys: string[] = []
    const collectMatchedKeys = (layers: PSDLayer[]) => {
      for (const layer of layers) {
        if (layer.children && layer.children.length > 0) {
          keys.push(layer.id)
          collectMatchedKeys(layer.children)
        }
      }
    }
    collectMatchedKeys(filteredLayers.value)
    expandedKeys.value = keys
  } else {
    // 清除搜索时恢复默认展开状态
    initializeExpandedKeys()
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.layer-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.layer-search {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.layer-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.layer-tree {
  background: transparent;
  
  :deep(.el-tree-node) {
    margin-bottom: 2px;
    
    .el-tree-node__content {
      height: auto;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      
      &:hover {
        background: #f0f9ff;
      }
    }
    
    .el-tree-node__expand-icon {
      color: #909399;
      font-size: 14px;
    }
  }
}

.layer-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
  cursor: pointer;
  
  &.layer-selected {
    background: #e1f3ff;
    border-radius: 4px;
  }
  
  .layer-visibility {
    font-size: 14px;
    color: #409eff;
    cursor: pointer;
    flex-shrink: 0;
    
    &.layer-hidden {
      color: #c0c4cc;
    }
    
    &:hover {
      color: #66b1ff;
    }
  }
  
  .layer-thumbnail {
    width: 24px;
    height: 24px;
    border-radius: 2px;
    border: 1px solid #e4e7ed;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    
    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .thumbnail-placeholder {
      font-size: 12px;
      color: #c0c4cc;
    }
  }
  
  .layer-info {
    flex: 1;
    min-width: 0;
    
    .layer-name {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }
    
    .layer-details {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      
      .layer-type-tag {
        font-size: 10px;
        height: 16px;
        line-height: 14px;
        padding: 0 4px;
      }
      
      .layer-size {
        font-size: 10px;
        color: #909399;
      }
    }
  }
  
  .layer-opacity {
    flex-shrink: 0;
    
    .opacity-text {
      font-size: 10px;
      color: #909399;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 48px;
    color: #c0c4cc;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 14px;
    color: #909399;
    margin: 0 0 12px 0;
  }
}

.layer-stats {
  background: #fff;
  
  .stats-content {
    display: flex;
    justify-content: space-around;
    padding: 8px 12px;
    
    .stat-item {
      text-align: center;
      
      .stat-label {
        font-size: 10px;
        color: #909399;
        display: block;
      }
      
      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        display: block;
        margin-top: 2px;
      }
    }
  }
}

// 响应式适配
@include respond-below(md) {
  .layer-node {
    gap: 6px;
    
    .layer-thumbnail {
      width: 20px;
      height: 20px;
    }
    
    .layer-info {
      .layer-name {
        font-size: 12px;
      }
    }
  }
}
</style>