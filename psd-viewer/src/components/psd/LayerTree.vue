<template>
  <div class="layer-tree-container">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-content">
        <div class="header-title">
          <el-icon class="title-icon"><FolderOpened /></el-icon>
          <h3 class="title-text">图层面板</h3>
        </div>
        
        <div class="header-actions">
          <el-tooltip content="展开所有" placement="bottom">
            <el-button 
              :icon="Expand" 
              size="small" 
              text 
              class="action-btn"
              @click="expandAll"
            />
          </el-tooltip>
          
          <el-tooltip content="折叠所有" placement="bottom">
            <el-button 
              :icon="Fold" 
              size="small" 
              text 
              class="action-btn"
              @click="collapseAll"
            />
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 图层搜索 -->
    <div class="layer-search" v-if="layers.length > 0">
      <div class="search-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索图层..."
          :prefix-icon="Search"
          clearable
          size="default"
          class="search-input"
        >
          <template #suffix>
            <el-text class="search-count" v-if="searchQuery.trim()">
              {{ filteredLayers.length }}/{{ totalLayerCount }}
            </el-text>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 图层树 -->
    <div class="layer-tree-content">
      <!-- 加载骨架屏 -->
      <div v-if="loading" class="loading-skeleton">
        <div v-for="i in 5" :key="i" class="skeleton-item">
          <el-skeleton animated>
            <template #template>
              <div class="skeleton-layer">
                <el-skeleton-item variant="circle" style="width: 20px; height: 20px;" />
                <el-skeleton-item variant="rect" style="width: 24px; height: 24px;" />
                <el-skeleton-item variant="text" style="width: 60%;" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>
      
      <!-- 图层列表 -->
      <el-tree
        v-else-if="filteredLayers.length > 0"
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
        <template #default="{ data }">
          <div 
            class="layer-node"
            :class="{ 
              'layer-selected': data.id === selectedLayerId,
              'layer-hidden': !data.visible,
              'layer-group': data.type === 'group'
            }"
          >
            <!-- 图层可见性切换 -->
            <div class="layer-visibility-wrapper">
              <el-button
                :icon="data.visible ? View : Hide"
                size="small"
                text
                class="visibility-btn"
                :class="{ 'is-hidden': !data.visible }"
                @click.stop="toggleLayerVisibility(data.id)"
              />
            </div>

            <!-- 图层缩略图 -->
            <div class="layer-thumbnail">
              <div class="thumbnail-wrapper">
                <img 
                  v-if="data.thumbnail" 
                  :src="data.thumbnail" 
                  :alt="data.name"
                  class="thumbnail-image"
                  loading="lazy"
                />
                <div v-else class="thumbnail-placeholder">
                  <el-icon class="placeholder-icon">
                    <component :is="getLayerIcon(data.type)" />
                  </el-icon>
                </div>
                
                <!-- 图层类型标记 -->
                <div class="layer-type-badge" :class="`type-${data.type}`">
                  <el-icon class="type-icon">
                    <component :is="getLayerIcon(data.type)" />
                  </el-icon>
                </div>
              </div>
            </div>

            <!-- 图层信息 -->
            <div class="layer-info">
              <div class="layer-name-wrapper">
                <span class="layer-name" :title="data.name">{{ data.name }}</span>
                <div class="layer-badges" v-if="data.children?.length">
                  <el-tag 
                    size="small" 
                    class="child-count-badge"
                    effect="plain"
                  >
                    {{ data.children.length }}
                  </el-tag>
                </div>
              </div>
              
              <div class="layer-details">
                <div class="layer-meta">
                  <span class="layer-size">{{ data.width }}×{{ data.height }}</span>
                  <span class="layer-opacity" v-if="data.opacity < 100">
                    {{ data.opacity }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- 图层操作 -->
            <div class="layer-actions">
              <el-dropdown trigger="click" size="small">
                <el-button 
                  :icon="More" 
                  size="small" 
                  text 
                  class="action-more-btn"
                />
                <template #dropdown>
                  <el-dropdown-menu class="layer-context-menu">
                    <el-dropdown-item>
                      <el-icon><CopyDocument /></el-icon>
                      复制图层
                    </el-dropdown-item>
                    <el-dropdown-item>
                      <el-icon><Download /></el-icon>
                      导出图层
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-icon><Hide /></el-icon>
                      {{ data.visible ? '隐藏' : '显示' }}图层
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </el-tree>

      <!-- 空状态 -->
      <div v-else-if="layers.length === 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">
            <el-icon><FolderAdd /></el-icon>
          </div>
          <h4 class="empty-title">暂无图层数据</h4>
          <p class="empty-description">请上传 PSD 文件查看图层结构</p>
        </div>
      </div>

      <!-- 搜索无结果 -->
      <div v-else class="empty-state search-empty">
        <div class="empty-content">
          <div class="empty-icon">
            <el-icon><Search /></el-icon>
          </div>
          <h4 class="empty-title">未找到匹配的图层</h4>
          <p class="empty-description">试试修改搜索关键词</p>
          <el-button type="primary" text @click="clearSearch" class="clear-search-btn">
            清除搜索
          </el-button>
        </div>
      </div>
    </div>

    <!-- 图层统计信息 -->
    <div class="layer-stats" v-if="layers.length > 0">
      <div class="stats-content">
        <div class="stat-item">
          <div class="stat-icon">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ layerCount.total }}</span>
            <span class="stat-label">总图层</span>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon success">
            <el-icon><View /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ layerCount.visible }}</span>
            <span class="stat-label">可见</span>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon muted">
            <el-icon><Hide /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ layerCount.hidden }}</span>
            <span class="stat-label">隐藏</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { 
  Search, 
  View, 
  Hide, 
  FolderOpened,
  FolderAdd,
  Expand,
  Fold,
  More,
  CopyDocument,
  Download,
  PictureRounded,
  EditPen,
  Grid,
  Setting
} from '@element-plus/icons-vue'
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
const loading = ref(false)

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

// 计算图层总数
const totalLayerCount = computed(() => {
  const countAllLayers = (layers: PSDLayer[]): number => {
    return layers.reduce((count, layer) => {
      return count + 1 + (layer.children ? countAllLayers(layer.children) : 0)
    }, 0)
  }
  return countAllLayers(layers.value)
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

// 展开/折叠所有节点
const expandAll = () => {
  const getAllLayerIds = (layers: PSDLayer[]): string[] => {
    const ids: string[] = []
    layers.forEach(layer => {
      if (layer.children && layer.children.length > 0) {
        ids.push(layer.id)
        ids.push(...getAllLayerIds(layer.children))
      }
    })
    return ids
  }
  expandedKeys.value = getAllLayerIds(layers.value)
}

const collapseAll = () => {
  expandedKeys.value = []
}

// 获取图层图标
const getLayerIcon = (type: string) => {
  const iconMap: Record<string, unknown> = {
    'group': FolderOpened,
    'text': EditPen,
    'effect': Setting,
    'masked': Grid,
    'normal': PictureRounded
  }
  return iconMap[type] || PictureRounded
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
@import '@/styles/variables.scss';

// =====================================
// 🎨 图层树容器
// =====================================

.layer-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  position: relative;
}

// =====================================
// 📋 面板头部
// =====================================

.panel-header {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-primary);
  @include glass-morphism(0.9);
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    
    .header-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      
      .title-icon {
        font-size: var(--font-size-lg);
        color: var(--color-primary-600);
      }
      
      .title-text {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
        margin: 0;
      }
    }
    
    .header-actions {
      display: flex;
      gap: var(--space-1);
      
      .action-btn {
        border-radius: var(--radius-md);
        transition: all var(--duration-normal) var(--ease-out);
        color: var(--text-tertiary);
        
        &:hover {
          background: var(--color-primary-50);
          color: var(--color-primary-600);
          transform: scale(1.05);
        }
      }
    }
  }
}

// =====================================
// 🔍 搜索区域
// =====================================

.layer-search {
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  
  .search-wrapper {
    position: relative;
    
    .search-input {
      :deep(.el-input__wrapper) {
        background: var(--bg-elevated);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        transition: all var(--duration-normal) var(--ease-out);
        box-shadow: var(--shadow-sm);
        
        &:hover {
          border-color: var(--color-primary-300);
          box-shadow: var(--shadow-md);
        }
        
        &.is-focus {
          border-color: var(--color-primary-500);
          box-shadow: var(--shadow-colored);
        }
      }
    }
    
    .search-count {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
      background: var(--color-primary-50);
      padding: 2px var(--space-1);
      border-radius: var(--radius-sm);
      margin-right: var(--space-1);
    }
  }
}

// =====================================
// 🌳 图层树内容
// =====================================

.layer-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: var(--radius-full);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-neutral-400);
    border-radius: var(--radius-full);
    
    &:hover {
      background: var(--color-neutral-500);
    }
  }
}

// 加载骨架屏
.loading-skeleton {
  padding: var(--space-2);
  
  .skeleton-item {
    margin-bottom: var(--space-3);
    
    .skeleton-layer {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2);
    }
  }
}

// 图层树样式
.layer-tree {
  background: transparent;
  
  :deep(.el-tree-node) {
    margin-bottom: var(--space-1);
    
    .el-tree-node__content {
      height: auto;
      padding: 0;
      border-radius: var(--radius-md);
      transition: all var(--duration-normal) var(--ease-out);
      background: transparent;
      position: relative;
      
      &:hover {
        background: var(--color-primary-50);
        
        .layer-node .layer-actions {
          opacity: 1;
          visibility: visible;
        }
      }
    }
    
    .el-tree-node__expand-icon {
      color: var(--text-tertiary);
      font-size: var(--font-size-sm);
      transition: all var(--duration-normal) var(--ease-out);
      
      &:hover {
        color: var(--color-primary-600);
        transform: scale(1.2);
      }
    }
    
    &.is-expanded > .el-tree-node__content .el-tree-node__expand-icon {
      color: var(--color-primary-600);
    }
  }
}

// =====================================
// 🎯 图层节点设计
// =====================================

.layer-node {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  min-height: 44px;
  
  // 选中状态
  &.layer-selected {
    background: var(--color-primary-100);
    border: 1px solid var(--color-primary-300);
    box-shadow: var(--shadow-sm);
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--color-primary-600);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }
    
    .layer-name {
      color: var(--color-primary-700);
      font-weight: var(--font-weight-medium);
    }
  }
  
  // 隐藏状态
  &.layer-hidden {
    opacity: 0.6;
    
    .layer-thumbnail {
      filter: grayscale(100%);
    }
    
    .layer-name {
      text-decoration: line-through;
      color: var(--text-tertiary);
    }
  }
  
  // 图层组特殊样式
  &.layer-group {
    background: var(--color-neutral-50);
    border: 1px dashed var(--border-secondary);
    
    .layer-thumbnail .thumbnail-wrapper {
      background: var(--color-primary-100);
      
      .placeholder-icon {
        color: var(--color-primary-600);
      }
    }
  }
  
  // 可见性按钮
  .layer-visibility-wrapper {
    .visibility-btn {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      transition: all var(--duration-normal) var(--ease-out);
      color: var(--color-success-600);
      
      &:hover {
        background: var(--color-success-50);
        transform: scale(1.1);
      }
      
      &.is-hidden {
        color: var(--text-tertiary);
        
        &:hover {
          background: var(--color-neutral-100);
          color: var(--text-secondary);
        }
      }
    }
  }
  
  // 缩略图
  .layer-thumbnail {
    flex-shrink: 0;
    
    .thumbnail-wrapper {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-primary);
      background: var(--bg-elevated);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      
      .thumbnail-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: var(--radius-sm);
      }
      
      .thumbnail-placeholder {
        .placeholder-icon {
          font-size: var(--font-size-lg);
          color: var(--text-tertiary);
        }
      }
      
      // 类型标记
      .layer-type-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 16px;
        height: 16px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--bg-elevated);
        
        .type-icon {
          font-size: 8px;
          color: var(--text-inverse);
        }
        
        &.type-group {
          background: var(--color-primary-500);
        }
        
        &.type-text {
          background: var(--color-success-500);
        }
        
        &.type-effect {
          background: var(--color-warning-500);
        }
        
        &.type-masked {
          background: var(--color-error-500);
        }
        
        &.type-normal {
          background: var(--color-neutral-500);
        }
      }
    }
  }
  
  // 图层信息
  .layer-info {
    flex: 1;
    min-width: 0;
    
    .layer-name-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
      
      .layer-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.4;
        flex: 1;
      }
      
      .layer-badges {
        display: flex;
        gap: var(--space-1);
        
        .child-count-badge {
          font-size: 10px;
          padding: 0 4px;
          height: 16px;
          line-height: 14px;
          background: var(--color-primary-100);
          color: var(--color-primary-700);
          border: none;
        }
      }
    }
    
    .layer-details {
      .layer-meta {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        
        .layer-size {
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
        }
        
        .layer-opacity {
          font-size: var(--font-size-xs);
          color: var(--color-warning-600);
          background: var(--color-warning-50);
          padding: 1px 4px;
          border-radius: var(--radius-sm);
        }
      }
    }
  }
  
  // 图层操作
  .layer-actions {
    opacity: 0;
    visibility: hidden;
    transition: all var(--duration-normal) var(--ease-out);
    
    .action-more-btn {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      color: var(--text-tertiary);
      
      &:hover {
        background: var(--color-neutral-100);
        color: var(--text-secondary);
      }
    }
  }
}

// 图层右键菜单
:deep(.layer-context-menu) {
  @include glass-morphism;
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  box-shadow: var(--shadow-xl);
  
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-out);
    
    &:hover {
      background: var(--color-primary-50);
      color: var(--color-primary-700);
    }
    
    .el-icon {
      font-size: var(--font-size-sm);
    }
  }
}

// =====================================
// 🈳 空状态设计
// =====================================

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  
  .empty-content {
    max-width: 200px;
    
    .empty-icon {
      font-size: 48px;
      color: var(--text-tertiary);
      margin-bottom: var(--space-4);
      opacity: 0.6;
      
      @include fade-in;
    }
    
    .empty-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
      margin: 0 0 var(--space-2) 0;
    }
    
    .empty-description {
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
      margin: 0 0 var(--space-4) 0;
      line-height: var(--line-height-relaxed);
    }
    
    .clear-search-btn {
      @include gradient-button;
      border-radius: var(--radius-lg);
      padding: var(--space-2) var(--space-4);
    }
  }
  
  &.search-empty {
    .empty-icon {
      color: var(--color-warning-500);
    }
  }
}

// =====================================
// 📊 统计信息
// =====================================

.layer-stats {
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-primary);
  padding: var(--space-3);
  @include glass-morphism(0.9);
  
  .stats-content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2);
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-primary);
      transition: all var(--duration-normal) var(--ease-out);
      
      &:hover {
        background: var(--bg-tertiary);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }
      
      .stat-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        background: var(--color-neutral-100);
        color: var(--color-neutral-600);
        
        &.success {
          background: var(--color-success-100);
          color: var(--color-success-600);
        }
        
        &.muted {
          background: var(--color-neutral-200);
          color: var(--color-neutral-500);
        }
        
        .el-icon {
          font-size: var(--font-size-sm);
        }
      }
      
      .stat-info {
        flex: 1;
        
        .stat-value {
          display: block;
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          line-height: 1.2;
        }
        
        .stat-label {
          display: block;
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
          margin-top: 1px;
        }
      }
    }
  }
}

// =====================================
// 📱 响应式适配
// =====================================

@include respond-below(lg) {
  .panel-header .header-content {
    padding: var(--space-3);
    
    .header-title .title-text {
      font-size: var(--font-size-sm);
    }
  }
  
  .layer-search {
    padding: var(--space-2);
  }
  
  .layer-node {
    padding: var(--space-1) var(--space-2);
    min-height: 40px;
    
    .layer-thumbnail .thumbnail-wrapper {
      width: 28px;
      height: 28px;
    }
    
    .layer-info .layer-name-wrapper .layer-name {
      font-size: var(--font-size-xs);
    }
  }
  
  .layer-stats {
    padding: var(--space-2);
    
    .stats-content {
      gap: var(--space-1);
      
      .stat-item {
        padding: var(--space-1);
        
        .stat-info {
          .stat-value {
            font-size: var(--font-size-base);
          }
        }
      }
    }
  }
}

// =====================================
// ✨ 动画效果
// =====================================

.layer-node {
  &:hover {
    .layer-thumbnail .thumbnail-wrapper .layer-type-badge {
      transform: scale(1.1);
    }
  }
}

// 图层展开动画
:deep(.el-tree-node__children) {
  @include slide-up(var(--duration-normal));
}

// 搜索结果高亮
.layer-tree {
  :deep(.search-highlight) {
    background: var(--color-warning-100);
    color: var(--color-warning-800);
    padding: 0 2px;
    border-radius: var(--radius-sm);
  }
}
</style>