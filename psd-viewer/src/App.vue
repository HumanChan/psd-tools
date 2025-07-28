<template>
  <div class="app-layout">
    <!-- 顶部工具栏 -->
    <header class="toolbar-area">
      <el-row class="toolbar" justify="space-between" align="middle">
        <el-col :xs="8" :sm="6" :md="4">
          <div class="toolbar-left">
            <el-button 
              v-if="isMobile" 
              @click="toggleSidebar"
              :icon="Menu"
              type="text"
              size="large"
            />
            <h1 class="app-title">PSD Viewer</h1>
          </div>
        </el-col>
        
        <el-col :xs="16" :sm="12" :md="16">
          <div class="toolbar-center">
            <el-button-group class="canvas-controls" v-if="currentFile">
              <el-tooltip content="适应屏幕">
                <el-button @click="fitToScreen" :icon="FullScreen" />
              </el-tooltip>
              <el-tooltip content="实际大小">
                <el-button @click="actualSize" :icon="ScaleToOriginal" />
              </el-tooltip>
            </el-button-group>
          </div>
        </el-col>
        
        <el-col :xs="0" :sm="6" :md="4">
          <div class="toolbar-right" v-if="currentFile">
            <span class="zoom-info">{{ zoomLevel }}%</span>
          </div>
        </el-col>
      </el-row>
    </header>

    <!-- 左侧图层面板 -->
    <aside class="sidebar-area" v-if="isDesktop">
      <LayerTree />
    </aside>

    <!-- 中央预览区域 -->
    <main class="canvas-area">
      <FileUpload v-if="!currentFile" />
      <PSDCanvas v-else />
    </main>

    <!-- 右侧信息面板 (桌面端) -->
    <aside class="panel-area" v-if="isDesktop">
      <FileInfo />
    </aside>

    <!-- 底部信息区域 (平板端) -->
    <section class="info-area" v-if="isTablet">
      <FileInfo />
    </section>
    
    <!-- 移动端抽屉 -->
    <section class="drawer-area" v-if="isMobile">
      <!-- 移动端底部面板将通过 el-drawer 实现 -->
    </section>
  </div>

  <!-- 移动端侧边栏抽屉 -->
  <el-drawer
    v-if="isMobile"
    v-model="sidebarVisible"
    :with-header="false"
    :modal="true"
    :size="'80%'"
    direction="ltr"
  >
    <LayerTree />
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Menu, FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'
import { useResponsiveLayout } from '@/composables/useResponsive'
import { usePSDStore } from '@/stores/psd'
import FileUpload from '@/components/psd/FileUpload.vue'
import LayerTree from '@/components/psd/LayerTree.vue'
import FileInfo from '@/components/psd/FileInfo.vue'
import PSDCanvas from '@/components/psd/PSDCanvas.vue'

// 响应式布局
const { 
  isMobile, 
  isTablet, 
  isDesktop, 
  sidebarVisible, 
  toggleSidebar 
} = useResponsiveLayout()

// PSD状态
const psdStore = usePSDStore()

// 响应式数据
const currentFile = computed(() => psdStore.currentFile)

// 缩放相关
const zoomLevel = ref(100)

// 工具栏方法
const fitToScreen = () => {
  // TODO: 实现适应屏幕功能
  console.log('适应屏幕')
}

const actualSize = () => {
  // TODO: 实现实际大小功能
  zoomLevel.value = 100
  console.log('实际大小')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.toolbar {
  height: 100%;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .app-title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin: 0;
      
      @include respond-below(md) {
        font-size: 16px;
      }
    }
  }
  
  .toolbar-center {
    display: flex;
    justify-content: center;
    
    .canvas-controls {
      .el-button {
        border-radius: 4px;
      }
    }
  }
  
  .toolbar-right {
    display: flex;
    justify-content: flex-end;
    
    .zoom-info {
      font-size: 14px;
      color: #606266;
      font-weight: 500;
    }
  }
}

.sidebar-area,
.panel-area {
  background: #fafafa;
  border-right: 1px solid #e4e7ed;
  overflow: hidden;
}

.panel-area {
  border-right: none;
  border-left: 1px solid #e4e7ed;
}

.canvas-area {
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.info-area {
  background: #fafafa;
  border-top: 1px solid #e4e7ed;
  padding: 16px;
  overflow-y: auto;
}

// 移动端抽屉样式
:deep(.el-drawer__body) {
  padding: 0;
}
</style>