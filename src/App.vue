<template>
  <div id="app" class="psd-app">
    <div class="app-layout" :class="layoutClass">
      <!-- 左侧边栏 - 图层树 (桌面端和平板端) -->
      <aside 
        v-if="!isMobile" 
        class="left-sidebar"
        :class="{ 'collapsed': sidebarCollapsed }"
      >
        <LayerTree
          :layers="psdData?.layers"
          :selected-layer="selectedLayer"
          :loading="loading"
          @layer-select="handleLayerSelect"
          @layer-visibility-change="handleLayerVisibilityChange"
          @layers-visibility-change="handleLayersVisibilityChange"
          @layer-action="handleLayerAction"
        />
        
        <!-- 侧边栏折叠控制 -->
        <div class="sidebar-toggle" @click="toggleSidebar">
          <el-icon>
            <ArrowLeft v-if="!sidebarCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <main class="main-content">
        <!-- 顶部标题栏 -->
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">
              <el-icon><PictureFilled /></el-icon>
              PSD Viewer
            </h1>
            
            <!-- 移动端菜单按钮 -->
            <el-button
              v-if="isMobile"
              :icon="Menu"
              circle
              @click="showMobileDrawer = true"
              class="mobile-menu-btn"
            />
          </div>
          
          <div class="header-right">
            <!-- 文件信息快捷按钮 -->
            <el-button
              v-if="psdData && !isMobile"
              :icon="InfoFilled"
              @click="showInfoPanel = !showInfoPanel"
              :type="showInfoPanel ? 'primary' : 'default'"
            >
              信息面板
            </el-button>
            
            <!-- 响应式指示器 (开发模式) -->
            <el-tag v-if="isDev" size="small" class="device-indicator">
              {{ deviceType }}
            </el-tag>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="content-wrapper">
          <!-- PSD查看器 -->
          <div class="viewer-container">
            <PSDViewer
              :psd-data="psdData"
              :visible-layers="visibleLayerIds"
              @layer-click="handleLayerClick"
              @scale-change="handleScaleChange"
              @position-change="handlePositionChange"
            />
          </div>

          <!-- 文件上传区域 (无文件时显示) -->
          <div v-if="!psdData" class="upload-overlay">
            <FileUpload
              :max-size="50"
              @file-selected="handleFileSelected"
              @upload-start="handleUploadStart"
              @upload-success="handleUploadSuccess"
              @upload-error="handleUploadError"
            />
          </div>
        </div>
      </main>

      <!-- 右侧边栏 - 文件信息 (桌面端) -->
      <aside 
        v-if="isDesktop && showInfoPanel && psdData" 
        class="right-sidebar"
      >
        <FileInfo
          :psd-data="psdData"
          :visible-layers="visibleLayerIds"
          @export="handleInfoExport"
          @copy="handleInfoCopy"
        />
      </aside>
    </div>

    <!-- 移动端抽屉 - 图层树 -->
    <el-drawer
      v-model="showMobileDrawer"
      title="图层管理"
      direction="ltr"
      :size="isMobile ? '100%' : '320px'"
      class="mobile-drawer"
    >
      <LayerTree
        :layers="psdData?.layers"
        :selected-layer="selectedLayer"
        :loading="loading"
        @layer-select="handleLayerSelect"
        @layer-visibility-change="handleLayerVisibilityChange"
        @layers-visibility-change="handleLayersVisibilityChange"
        @layer-action="handleLayerAction"
      />
    </el-drawer>

    <!-- 底部信息栏 (平板端) -->
    <footer v-if="isTablet && psdData" class="bottom-info">
      <div class="info-summary">
        <span class="info-item">
          {{ psdData.width }} × {{ psdData.height }}
        </span>
        <span class="info-item">
          {{ psdData.metadata.layerCount }} 图层
        </span>
        <span class="info-item">
          {{ Math.round(currentScale * 100) }}%
        </span>
      </div>
      
      <el-button
        size="small"
        @click="showInfoDialog = true"
      >
        详细信息
      </el-button>
    </footer>

    <!-- 文件信息对话框 (移动端和平板端) -->
    <el-dialog
      v-model="showInfoDialog"
      title="文件信息"
      :width="isMobile ? '95%' : '600px'"
      :fullscreen="isMobile"
    >
      <FileInfo
        :psd-data="psdData"
        :visible-layers="visibleLayerIds"
        @export="handleInfoExport"
        @copy="handleInfoCopy"
      />
    </el-dialog>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <el-icon class="loading-icon">
          <Loading />
        </el-icon>
        <div class="loading-text">{{ loadingText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import {
  PictureFilled, Menu, ArrowLeft, ArrowRight, InfoFilled, Loading
} from '@element-plus/icons-vue'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import { parsePSD } from '@/utils/psdParser'
import type { PSDData, LayerData } from '@/types/psd'

// 组件导入
import FileUpload from '@/components/FileUpload.vue'
import PSDViewer from '@/components/PSDViewer.vue'
import LayerTree from '@/components/LayerTree.vue'
import FileInfo from '@/components/FileInfo.vue'

// Composables
const { isMobile, isTablet, isDesktop } = useResponsiveLayout()

// 状态管理
const psdData = ref<PSDData | null>(null)
const selectedLayer = ref<LayerData | null>(null)
const visibleLayerIds = ref<string[]>([])
const loading = ref(false)
const loadingText = ref('')

// UI状态
const sidebarCollapsed = ref(false)
const showInfoPanel = ref(true)
const showMobileDrawer = ref(false)
const showInfoDialog = ref(false)
const currentScale = ref(1)

// 开发模式
const isDev = ref(import.meta.env.DEV)

// Computed
const layoutClass = computed(() => ({
  'desktop-layout': isDesktop.value,
  'tablet-layout': isTablet.value,
  'mobile-layout': isMobile.value,
  'sidebar-collapsed': sidebarCollapsed.value,
  'info-panel-open': showInfoPanel.value && isDesktop.value
}))

const deviceType = computed(() => {
  if (isMobile.value) return 'Mobile'
  if (isTablet.value) return 'Tablet'
  return 'Desktop'
})

// 文件处理
const handleFileSelected = (file: File) => {
  console.log('文件选择:', file.name)
}

const handleUploadStart = () => {
  loading.value = true
  loadingText.value = '正在解析PSD文件...'
}

const handleUploadSuccess = async (result: any) => {
  console.log('📥 [DEBUG-APP] 接收到解析结果:', result)
  
  try {
    // 如果result包含已解析的数据，直接使用
    if (result && result.name) {
      console.log('✅ [DEBUG-APP] 数据验证通过，设置PSD数据')
      psdData.value = result
      
      console.log('🔍 [DEBUG-APP] 当前PSD数据:', {
        name: psdData.value.name,
        dimensions: `${psdData.value.width}x${psdData.value.height}`,
        hasCompositeImage: !!psdData.value.compositeImage,
        hasCompositeImageData: !!psdData.value.compositeImageData,
        layerCount: psdData.value.layers.length
      })
    } else {
      // 否则显示错误
      console.error('❌ [DEBUG-APP] PSD解析结果无效:', result)
      throw new Error('PSD解析结果无效')
    }
    
    // 初始化可见图层
    visibleLayerIds.value = collectVisibleLayerIds(psdData.value.layers)
    console.log('👁️ [DEBUG-APP] 可见图层ID列表:', visibleLayerIds.value)
    
    ElNotification({
      title: '解析成功',
      message: `成功解析PSD文件: ${psdData.value.name}`,
      type: 'success',
      duration: 3000
    })
    
    console.log('✅ [DEBUG-APP] 上传处理完成')
    
  } catch (error) {
    console.error('❌ [DEBUG-APP] 上传处理失败:', error)
    ElMessage.error('PSD文件解析失败')
  } finally {
    loading.value = false
  }
}

const handleUploadError = (error: string) => {
  loading.value = false
  ElMessage.error(error)
}

// 图层管理
const handleLayerSelect = (layer: LayerData) => {
  selectedLayer.value = layer
  console.log('选择图层:', layer.name)
}

const handleLayerClick = (layer: LayerData) => {
  handleLayerSelect(layer)
}

const handleLayerVisibilityChange = (layer: LayerData, visible: boolean) => {
  console.log('图层可见性变化:', layer.name, visible)
  // 更新可见图层列表
  visibleLayerIds.value = collectVisibleLayerIds(psdData.value?.layers || [])
}

const handleLayersVisibilityChange = (layerIds: string[]) => {
  visibleLayerIds.value = layerIds
  console.log('批量图层可见性变化:', layerIds)
}

const handleLayerAction = (action: string, layer: LayerData) => {
  console.log('图层操作:', action, layer.name)
}

// 视图控制
const handleScaleChange = (scale: number) => {
  currentScale.value = scale
}

const handlePositionChange = (x: number, y: number) => {
  // console.log('位置变化:', x, y)
}

// UI操作
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleInfoExport = (type: string) => {
  console.log('导出信息:', type)
}

const handleInfoCopy = () => {
  console.log('复制信息')
}

// 工具函数
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
</script>

<style lang="scss" scoped>
.psd-app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.app-layout {
  display: grid;
  height: 100vh;
  transition: all 0.3s ease;

  // 桌面端布局
  &.desktop-layout {
    grid-template-columns: 320px 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "sidebar header"
      "sidebar main";

    &.info-panel-open {
      grid-template-columns: 320px 1fr 350px;
      grid-template-areas:
        "sidebar header info"
        "sidebar main info";
    }

    &.sidebar-collapsed {
      grid-template-columns: 60px 1fr;

      &.info-panel-open {
        grid-template-columns: 60px 1fr 350px;
      }
    }
  }

  // 平板端布局
  &.tablet-layout {
    grid-template-columns: 280px 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "sidebar header"
      "sidebar main"
      "footer footer";

    &.sidebar-collapsed {
      grid-template-columns: 60px 1fr;
    }
  }

  // 移动端布局
  &.mobile-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "header"
      "main";
  }
}

.left-sidebar {
  grid-area: sidebar;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &.collapsed {
    width: 60px;
  }

  .sidebar-toggle {
    position: absolute;
    top: 50%;
    right: -12px;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    background: var(--el-color-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      background: var(--el-color-primary-dark-2);
      transform: translateY(-50%) scale(1.1);
    }
  }
}

.main-content {
  grid-area: main;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-sidebar {
  grid-area: info;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color);
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  z-index: 5;

  .mobile-layout & {
    padding: 12px 16px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .app-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    .mobile-layout & {
      font-size: 16px;
    }
  }

  .mobile-menu-btn {
    margin-left: auto;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .device-indicator {
    font-size: 11px;
  }
}

.content-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.viewer-container {
  width: 100%;
  height: 100%;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: var(--el-bg-color-page);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-info {
  grid-area: footer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);

  .info-summary {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    .info-item {
      padding: 2px 8px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    }
  }
}

.mobile-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .loading-content {
    text-align: center;
    color: var(--el-text-color-primary);

    .loading-icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: 16px;
      font-weight: 500;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式优化
@media (max-width: 1200px) {
  .app-layout.desktop-layout.info-panel-open {
    grid-template-columns: 280px 1fr 320px;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 10px 12px;

    .app-title {
      font-size: 16px;
    }
  }
}
</style>