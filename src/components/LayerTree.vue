<template>
  <div class="layer-tree-container" :class="{ 'mobile-tree': isMobile }">
    <!-- 头部工具栏 -->
    <div class="tree-header">
      <div class="header-title">
        <el-icon><Menu /></el-icon>
        <span>图层</span>
        <span v-if="totalLayers" class="layer-count">({{ totalLayers }})</span>
      </div>
      
      <div class="header-actions">
        <el-button
          v-if="!isMobile"
          :icon="Search"
          size="small"
          circle
          @click="toggleSearch"
          :type="showSearch ? 'primary' : 'default'"
        />
        <el-button
          :icon="Refresh"
          size="small"
          circle
          @click="refreshLayers"
          title="刷新图层"
        />
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-if="showSearch" class="search-box">
      <el-input
        v-model="searchText"
        placeholder="搜索图层..."
        size="small"
        clearable
        :prefix-icon="Search"
        @input="handleSearch"
      />
    </div>

    <!-- 图层统计信息 -->
    <div v-if="layerStats && !isMobile" class="layer-stats">
      <div class="stat-item">
        <span class="stat-label">可见:</span>
        <span class="stat-value">{{ layerStats.visible }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">隐藏:</span>
        <span class="stat-value">{{ layerStats.hidden }}</span>
      </div>
    </div>

    <!-- 图层树 -->
    <div class="tree-content">
      <el-tree
        ref="treeRef"
        :data="filteredLayers"
        :props="treeProps"
        node-key="id"
        :default-expand-all="!isMobile"
        :expand-on-click-node="false"
        :check-on-click-node="false"
        :highlight-current="true"
        :indent="isMobile ? 12 : 16"
        class="layer-tree"
        @node-click="handleNodeClick"
        @check-change="handleCheckChange"
      >
        <template #default="{ node, data }">
          <div class="layer-node" :class="{ 'selected': selectedLayer?.id === data.id }">
            <!-- 图层可见性控制 -->
            <div class="layer-visibility">
              <el-icon
                :class="['visibility-icon', { 'visible': data.visible, 'hidden': !data.visible }]"
                @click.stop="toggleLayerVisibility(data)"
              >
                <View v-if="data.visible" />
                <Hide v-else />
              </el-icon>
            </div>

            <!-- 图层图标 -->
            <div class="layer-icon">
              <el-icon :class="getLayerIconClass(data)">
                <component :is="getLayerIcon(data)" />
              </el-icon>
            </div>

            <!-- 图层信息 -->
            <div class="layer-info">
              <div class="layer-name" :title="data.name">
                {{ data.name }}
              </div>
              <div v-if="!isMobile" class="layer-details">
                <span class="layer-type">{{ getLayerTypeText(data.type) }}</span>
                <span v-if="data.opacity < 1" class="layer-opacity">
                  {{ Math.round(data.opacity * 100) }}%
                </span>
                <span v-if="data.blendMode !== 'normal'" class="layer-blend">
                  {{ data.blendMode }}
                </span>
              </div>
            </div>

            <!-- 图层操作 -->
            <div class="layer-actions">
              <el-dropdown
                v-if="!isMobile"
                trigger="click"
                @command="handleLayerAction"
              >
                <el-icon class="action-icon">
                  <More />
                </el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="`copy-${data.id}`">
                      复制图层
                    </el-dropdown-item>
                    <el-dropdown-item :command="`isolate-${data.id}`">
                      单独显示
                    </el-dropdown-item>
                    <el-dropdown-item :command="`export-${data.id}`">
                      导出图层
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </el-tree>

      <!-- 空状态 -->
      <div v-if="!layers || layers.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Picture /></el-icon>
        <div class="empty-text">暂无图层数据</div>
      </div>

      <!-- 搜索无结果 -->
      <div v-if="searchText && filteredLayers.length === 0" class="no-results">
        <el-icon class="no-results-icon"><Search /></el-icon>
        <div class="no-results-text">未找到匹配的图层</div>
        <el-button size="small" @click="clearSearch">清除搜索</el-button>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="layers && layers.length > 0" class="tree-footer">
      <el-button-group>
        <el-button
          size="small"
          @click="showAllLayers"
          title="显示所有图层"
        >
          <el-icon><View /></el-icon>
          {{ isMobile ? '' : '全部显示' }}
        </el-button>
        <el-button
          size="small"
          @click="hideAllLayers"
          title="隐藏所有图层"
        >
          <el-icon><Hide /></el-icon>
          {{ isMobile ? '' : '全部隐藏' }}
        </el-button>
      </el-button-group>
      
      <el-button
        v-if="!isMobile"
        size="small"
        @click="expandAll"
        title="展开所有分组"
      >
        <el-icon><ArrowDown /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Menu, Search, Refresh, View, Hide, More, Picture,
  ArrowDown, Document, Folder, EditPen
} from '@element-plus/icons-vue'
import type { ElTree } from 'element-plus'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import type { LayerData } from '@/types/psd'

// Props
interface LayerTreeProps {
  layers?: LayerData[]
  selectedLayer?: LayerData | null
  loading?: boolean
}

const props = withDefaults(defineProps<LayerTreeProps>(), {
  layers: () => [],
  selectedLayer: null,
  loading: false
})

// Emits
const emit = defineEmits<{
  layerSelect: [layer: LayerData]
  layerVisibilityChange: [layer: LayerData, visible: boolean]
  layersVisibilityChange: [visibleLayerIds: string[]]
  layerAction: [action: string, layer: LayerData]
}>()

// Composables
const { isMobile } = useResponsiveLayout()

// Refs
const treeRef = ref<InstanceType<typeof ElTree>>()
const searchText = ref('')
const showSearch = ref(false)

// Tree配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// Computed
const totalLayers = computed(() => {
  if (!props.layers) return 0
  return countLayers(props.layers)
})

const layerStats = computed(() => {
  if (!props.layers) return null
  
  let visible = 0
  let hidden = 0
  
  const countVisibility = (layers: LayerData[]) => {
    for (const layer of layers) {
      if (layer.visible) {
        visible++
      } else {
        hidden++
      }
      
      if (layer.children) {
        countVisibility(layer.children)
      }
    }
  }
  
  countVisibility(props.layers)
  
  return { visible, hidden }
})

const filteredLayers = computed(() => {
  if (!props.layers) return []
  if (!searchText.value) return props.layers
  
  return filterLayers(props.layers, searchText.value.toLowerCase())
})

// Methods
const countLayers = (layers: LayerData[]): number => {
  let count = 0
  for (const layer of layers) {
    count++
    if (layer.children) {
      count += countLayers(layer.children)
    }
  }
  return count
}

const filterLayers = (layers: LayerData[], search: string): LayerData[] => {
  const filtered: LayerData[] = []
  
  for (const layer of layers) {
    const matchesSearch = layer.name.toLowerCase().includes(search)
    const filteredChildren = layer.children ? filterLayers(layer.children, search) : []
    
    if (matchesSearch || filteredChildren.length > 0) {
      filtered.push({
        ...layer,
        children: filteredChildren
      })
    }
  }
  
  return filtered
}

const getLayerIcon = (layer: LayerData) => {
  switch (layer.type) {
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

const getLayerIconClass = (layer: LayerData) => {
  return {
    'layer-icon-group': layer.type === 'group',
    'layer-icon-text': layer.type === 'text',
    'layer-icon-shape': layer.type === 'shape',
    'layer-icon-image': layer.type === 'image',
    'layer-icon-hidden': !layer.visible
  }
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

// Event handlers
const handleNodeClick = (layer: LayerData) => {
  emit('layerSelect', layer)
}

const handleCheckChange = () => {
  // 处理复选框变化
}

const toggleLayerVisibility = (layer: LayerData) => {
  layer.visible = !layer.visible
  emit('layerVisibilityChange', layer, layer.visible)
  
  // 收集所有可见图层ID
  const visibleIds = collectVisibleLayerIds(props.layers || [])
  emit('layersVisibilityChange', visibleIds)
}

const collectVisibleLayerIds = (layers: LayerData[]): string[] => {
  const visibleIds: string[] = []
  
  const collect = (layers: LayerData[]) => {
    for (const layer of layers) {
      if (layer.visible) {
        visibleIds.push(layer.id)
      }
      if (layer.children) {
        collect(layer.children)
      }
    }
  }
  
  collect(layers)
  return visibleIds
}

const showAllLayers = () => {
  if (!props.layers) return
  
  const setAllVisible = (layers: LayerData[]) => {
    for (const layer of layers) {
      layer.visible = true
      if (layer.children) {
        setAllVisible(layer.children)
      }
    }
  }
  
  setAllVisible(props.layers)
  const visibleIds = collectVisibleLayerIds(props.layers)
  emit('layersVisibilityChange', visibleIds)
  
  ElMessage.success('已显示所有图层')
}

const hideAllLayers = () => {
  if (!props.layers) return
  
  const setAllHidden = (layers: LayerData[]) => {
    for (const layer of layers) {
      layer.visible = false
      if (layer.children) {
        setAllHidden(layer.children)
      }
    }
  }
  
  setAllHidden(props.layers)
  emit('layersVisibilityChange', [])
  
  ElMessage.success('已隐藏所有图层')
}

const expandAll = () => {
  if (treeRef.value) {
    const expandNodes = (layers: LayerData[]) => {
      for (const layer of layers) {
        if (layer.children && layer.children.length > 0) {
          treeRef.value?.setExpanded(layer.id, true)
          expandNodes(layer.children)
        }
      }
    }
    expandNodes(props.layers || [])
  }
}

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchText.value = ''
  }
}

const handleSearch = () => {
  // 搜索逻辑已在computed中处理
}

const clearSearch = () => {
  searchText.value = ''
}

const refreshLayers = () => {
  ElMessage.success('图层已刷新')
}

const handleLayerAction = (command: string) => {
  const [action, layerId] = command.split('-')
  const layer = findLayerById(props.layers || [], layerId)
  
  if (layer) {
    emit('layerAction', action, layer)
    
    switch (action) {
      case 'copy':
        ElMessage.success(`已复制图层: ${layer.name}`)
        break
      case 'isolate':
        // 单独显示选中图层
        hideAllLayers()
        layer.visible = true
        const visibleIds = [layer.id]
        emit('layersVisibilityChange', visibleIds)
        ElMessage.success(`单独显示: ${layer.name}`)
        break
      case 'export':
        ElMessage.info(`导出功能开发中: ${layer.name}`)
        break
    }
  }
}

const findLayerById = (layers: LayerData[], id: string): LayerData | null => {
  for (const layer of layers) {
    if (layer.id === id) {
      return layer
    }
    if (layer.children) {
      const found = findLayerById(layer.children, id)
      if (found) return found
    }
  }
  return null
}

// Watch
watch(() => props.selectedLayer, (newLayer) => {
  if (newLayer && treeRef.value) {
    nextTick(() => {
      treeRef.value?.setCurrentKey(newLayer.id)
    })
  }
})
</script>

<style lang="scss" scoped>
.layer-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;

  &.mobile-tree {
    border: none;
    border-radius: 0;
  }
}

.tree-header {
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

    .layer-count {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.search-box {
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.layer-stats {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 12px;

  .stat-item {
    display: flex;
    gap: 4px;

    .stat-label {
      color: var(--el-text-color-secondary);
    }

    .stat-value {
      color: var(--el-text-color-primary);
      font-weight: 500;
    }
  }
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
}

.layer-tree {
  :deep(.el-tree-node__content) {
    height: auto;
    padding: 2px 0;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  :deep(.el-tree-node__expand-icon) {
    padding: 4px;
    font-size: 12px;
  }
}

.layer-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  min-height: 32px;

  &.selected {
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
  }

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.layer-visibility {
  .visibility-icon {
    cursor: pointer;
    padding: 2px;
    border-radius: 2px;
    transition: all 0.2s;

    &.visible {
      color: var(--el-color-success);
    }

    &.hidden {
      color: var(--el-text-color-disabled);
    }

    &:hover {
      background: var(--el-fill-color);
    }
  }
}

.layer-icon {
  .layer-icon-group {
    color: var(--el-color-warning);
  }

  .layer-icon-text {
    color: var(--el-color-primary);
  }

  .layer-icon-shape {
    color: var(--el-color-success);
  }

  .layer-icon-image {
    color: var(--el-text-color-secondary);
  }

  .layer-icon-hidden {
    opacity: 0.5;
  }
}

.layer-info {
  flex: 1;
  min-width: 0;

  .layer-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .layer-details {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;

    .layer-type {
      background: var(--el-fill-color);
      padding: 1px 4px;
      border-radius: 2px;
    }

    .layer-opacity,
    .layer-blend {
      background: var(--el-color-info-light-8);
      color: var(--el-color-info);
      padding: 1px 4px;
      border-radius: 2px;
    }
  }
}

.layer-actions {
  .action-icon {
    padding: 4px;
    border-radius: 2px;
    cursor: pointer;
    color: var(--el-text-color-secondary);

    &:hover {
      background: var(--el-fill-color);
      color: var(--el-color-primary);
    }
  }
}

.empty-state,
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);

  .empty-icon,
  .no-results-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text,
  .no-results-text {
    margin-bottom: 16px;
  }
}

.tree-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-light);

  .mobile-tree & {
    padding: 6px 12px;

    .el-button {
      padding: 4px 8px;
      font-size: 12px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .layer-node {
    padding: 8px 6px;
    gap: 6px;
  }

  .layer-info .layer-name {
    font-size: 13px;
  }

  .tree-header {
    padding: 10px 12px;
  }

  .search-box {
    padding: 6px 12px;
  }
}
</style>