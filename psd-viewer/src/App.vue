<template>
  <div class="app-layout theme-transition">
    <!-- 顶部工具栏 -->
    <header class="toolbar-area">
      <div class="toolbar">
        <!-- 左侧：品牌标识和菜单 -->
        <div class="toolbar-left">
          <el-button 
            v-if="isMobile" 
            @click="toggleSidebar"
            :icon="Menu"
            type="text"
            size="large"
            class="mobile-menu-btn"
          />
          
          <div class="brand-section">
            <div class="app-logo">
              <div class="logo-icon">
                <el-icon size="24"><Camera /></el-icon>
              </div>
              <div class="logo-text">
                <h1 class="app-title">PSD Viewer</h1>
                <span class="app-subtitle">Professional Design Tool</span>
              </div>
            </div>
          </div>
          
          <!-- 面包屑导航 -->
          <div class="breadcrumb-nav" v-if="currentFile && !isMobile">
            <el-breadcrumb separator="/" class="file-breadcrumb">
              <el-breadcrumb-item>
                <el-icon><Folder /></el-icon>
                文件
              </el-breadcrumb-item>
              <el-breadcrumb-item class="current-file">
                <el-icon><Document /></el-icon>
                {{ currentFile.name }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
        </div>
        
        <!-- 中央：工具控制 -->
        <div class="toolbar-center">
          <div class="canvas-controls" v-if="currentFile">
            <div class="control-group primary-controls">
              <el-tooltip content="适应屏幕 (Ctrl+0)" placement="bottom">
                <el-button 
                  @click="fitToScreen" 
                  :icon="FullScreen" 
                  size="default"
                  class="control-btn"
                />
              </el-tooltip>
              
              <el-tooltip content="实际大小 (Ctrl+1)" placement="bottom">
                <el-button 
                  @click="actualSize" 
                  :icon="ScaleToOriginal" 
                  size="default"
                  class="control-btn"
                />
              </el-tooltip>
              
              <div class="zoom-display">
                <span class="zoom-value">{{ Math.round(zoomLevel * 100) }}%</span>
              </div>
            </div>
            
            <div class="control-separator"></div>
            
            <div class="control-group secondary-controls">
              <el-tooltip content="网格显示" placement="bottom">
                <el-button 
                  :icon="Grid" 
                  size="default"
                  class="control-btn"
                  :class="{ 'is-active': showGrid }"
                  @click="toggleGrid"
                />
              </el-tooltip>
              
              <el-tooltip content="标尺显示" placement="bottom">
                <el-button 
                  :icon="Tools" 
                  size="default"
                  class="control-btn"
                  :class="{ 'is-active': showRuler }"
                  @click="toggleRuler"
                />
              </el-tooltip>
            </div>
          </div>
          
          <!-- 无文件时的欢迎信息 -->
          <div class="welcome-info" v-else>
            <span class="welcome-text">选择 PSD 文件开始预览</span>
          </div>
        </div>
        
        <!-- 右侧：设置和信息 -->
        <div class="toolbar-right">
          <!-- 文件信息 -->
          <div class="file-info" v-if="currentFile && !isMobile">
            <div class="file-stats">
              <span class="stat-item">
                <el-icon><Picture /></el-icon>
                {{ currentFile.width }}×{{ currentFile.height }}
              </span>
              <span class="stat-item">
                <el-icon><FolderOpened /></el-icon>
                {{ currentFile.layers.length }} 图层
              </span>
            </div>
          </div>
          
          <!-- 主题切换 -->
          <ThemeSwitcher 
            variant="simple" 
            size="default" 
            :circle="true"
            class="theme-switcher"
          />
          
          <!-- 更多选项 -->
          <el-dropdown trigger="click" class="more-options">
            <el-button 
              :icon="More" 
              size="default" 
              circle
              class="more-btn"
            />
            <template #dropdown>
              <el-dropdown-menu class="options-menu">
                <el-dropdown-item>
                  <el-icon><Setting /></el-icon>
                  设置
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-icon><QuestionFilled /></el-icon>
                  帮助
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-icon><InfoFilled /></el-icon>
                  关于
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
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
import { 
  Menu, 
  FullScreen, 
  ScaleToOriginal,
  Camera,
  Folder,
  Document,
  Grid,
  Tools,
  Picture,
  FolderOpened,
  More,
  Setting,
  QuestionFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import { useResponsiveLayout } from '@/composables/useResponsive'
import { usePSDStore } from '@/stores/psd'
import { useTheme } from '@/composables/useTheme'
import FileUpload from '@/components/psd/FileUpload.vue'
import LayerTree from '@/components/psd/LayerTree.vue'
import FileInfo from '@/components/psd/FileInfo.vue'
import PSDCanvas from '@/components/psd/PSDCanvas.vue'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

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

// 主题管理
const { initializeTheme } = useTheme()

// 响应式数据
const currentFile = computed(() => psdStore.currentFile)

// 缩放相关
const zoomLevel = ref(100)

// 显示控制
const showGrid = ref(false)
const showRuler = ref(false)

// 工具栏方法
const fitToScreen = () => {
  // TODO: 与PSDCanvas组件通信
  console.log('适应屏幕')
}

const actualSize = () => {
  // TODO: 与PSDCanvas组件通信
  zoomLevel.value = 100
  console.log('实际大小')
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  console.log('切换网格:', showGrid.value)
}

const toggleRuler = () => {
  showRuler.value = !showRuler.value
  console.log('切换标尺:', showRuler.value)
}

// 初始化主题
initializeTheme()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

// =====================================
// 🎨 应用布局
// =====================================

.app-layout {
  height: 100vh;
  width: 100vw;
  display: grid;
  grid-template-areas: 
    "toolbar toolbar toolbar"
    "sidebar canvas panel"
    "info info info";
  grid-template-columns: var(--sidebar-width-desktop) 1fr var(--panel-width-desktop);
  grid-template-rows: var(--toolbar-height-desktop) 1fr var(--info-panel-height-tablet);
  background: var(--bg-primary);
  
  @include respond-below(xl) {
    grid-template-areas: 
      "toolbar toolbar"
      "sidebar canvas"
      "info info";
    grid-template-columns: var(--sidebar-width-tablet) 1fr;
  }
  
  @include respond-below(md) {
    grid-template-areas: 
      "toolbar"
      "canvas"
      "info";
    grid-template-columns: 1fr;
    grid-template-rows: var(--toolbar-height-mobile) 1fr auto;
  }
}

// =====================================
// 🔝 顶部工具栏设计
// =====================================

.toolbar-area {
  grid-area: toolbar;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-primary);
  position: relative;
  z-index: var(--z-sticky);
  
  // 玻璃拟态效果
  @include glass-morphism(0.95);
  backdrop-filter: var(--backdrop-blur);
  
  // 渐变背景
  background: linear-gradient(145deg, 
    var(--bg-elevated) 0%, 
    var(--bg-secondary) 100%
  );
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-primary);
    opacity: 0.3;
  }
}

.toolbar {
  height: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 0 var(--toolbar-padding);
  gap: var(--space-6);
  
  @include respond-below(md) {
    gap: var(--space-4);
    padding: 0 var(--space-3);
  }
}

// 左侧：品牌区域
.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
  
  .mobile-menu-btn {
    @include glass-morphism(0.8);
    border-radius: var(--radius-lg);
    transition: all var(--duration-normal) var(--ease-out);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }
  
  .brand-section {
    .app-logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      
      .logo-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-lg);
        background: var(--gradient-primary);
        color: var(--text-inverse);
        box-shadow: var(--shadow-colored);
        transition: all var(--duration-normal) var(--ease-bounce);
        
        &:hover {
          transform: rotate(10deg) scale(1.05);
        }
      }
      
      .logo-text {
        .app-title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          margin: 0;
          line-height: 1.2;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          
          @include respond-below(lg) {
            font-size: var(--font-size-lg);
          }
          
          @include respond-below(md) {
            font-size: var(--font-size-base);
          }
        }
        
        .app-subtitle {
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
          font-weight: var(--font-weight-medium);
          display: block;
          margin-top: -2px;
          
          @include respond-below(lg) {
            display: none;
          }
        }
      }
    }
  }
  
  .breadcrumb-nav {
    margin-left: var(--space-6);
    
    .file-breadcrumb {
      :deep(.el-breadcrumb__item) {
        .el-breadcrumb__inner {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          
          .el-icon {
            font-size: var(--font-size-sm);
          }
        }
        
        &:last-child .el-breadcrumb__inner {
          color: var(--text-brand);
          font-weight: var(--font-weight-medium);
        }
      }
    }
  }
}

// 中央：工具控制区域
.toolbar-center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  
  .canvas-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--bg-tertiary);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-primary);
    @include glass-morphism(0.7);
    
    .control-group {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      
      .control-btn {
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        transition: all var(--duration-normal) var(--ease-out);
        color: var(--text-secondary);
        
        &:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        
        &.is-active {
          background: var(--color-primary-100);
          color: var(--color-primary-700);
          
          &:hover {
            background: var(--color-primary-200);
          }
        }
      }
      
      .zoom-display {
        padding: var(--space-2) var(--space-3);
        background: var(--bg-elevated);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-primary);
        
        .zoom-value {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--text-brand);
          min-width: 45px;
          text-align: center;
          display: inline-block;
        }
      }
    }
    
    .control-separator {
      width: 1px;
      height: 20px;
      background: var(--border-primary);
      margin: 0 var(--space-1);
    }
    
    @include respond-below(md) {
      padding: var(--space-1);
      gap: var(--space-1);
      
      .control-group {
        gap: 2px;
      }
      
      .zoom-display {
        padding: var(--space-1) var(--space-2);
        
        .zoom-value {
          font-size: var(--font-size-xs);
          min-width: 35px;
        }
      }
    }
  }
  
  .welcome-info {
    .welcome-text {
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
      font-style: italic;
    }
  }
}

// 右侧：信息和设置区域
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  
  .file-info {
    .file-stats {
      display: flex;
      gap: var(--space-4);
      
      .stat-item {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        
        .el-icon {
          font-size: var(--font-size-sm);
          color: var(--text-tertiary);
        }
      }
    }
  }
  
  .theme-switcher {
    :deep(.theme-toggle-btn) {
      @include glass-morphism(0.8);
      border-radius: var(--radius-full);
      transition: all var(--duration-normal) var(--ease-out);
      
      &:hover {
        transform: translateY(-1px) scale(1.05);
        box-shadow: var(--shadow-lg);
      }
    }
  }
  
  .more-options {
    .more-btn {
      @include glass-morphism(0.8);
      border-radius: var(--radius-full);
      transition: all var(--duration-normal) var(--ease-out);
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }
    }
    
    :deep(.options-menu) {
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
          font-size: var(--font-size-lg);
        }
      }
    }
  }
}

// =====================================
// 📱 响应式适配
// =====================================

@include respond-below(lg) {
  .toolbar {
    .toolbar-left {
      .breadcrumb-nav {
        margin-left: var(--space-3);
      }
    }
    
    .toolbar-right {
      .file-info .file-stats {
        gap: var(--space-2);
        
        .stat-item {
          font-size: var(--font-size-xs);
        }
      }
    }
  }
}

@include respond-below(md) {
  .toolbar-right {
    gap: var(--space-2);
    
    .file-info {
      display: none;
    }
    
    .more-options .more-btn {
      width: 36px;
      height: 36px;
    }
  }
}

// =====================================
// 🏗️ 区域布局
// =====================================

.sidebar-area,
.panel-area {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  overflow: hidden;
  @include glass-morphism(0.5);
}

.panel-area {
  grid-area: panel;
  border-right: none;
  border-left: 1px solid var(--border-primary);
  
  @include respond-below(xl) {
    display: none;
  }
}

.sidebar-area {
  grid-area: sidebar;
  
  @include respond-below(md) {
    display: none;
  }
}

.canvas-area {
  grid-area: canvas;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.info-area {
  grid-area: info;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  padding: var(--panel-padding);
  overflow-y: auto;
  @include glass-morphism(0.5);
  
  @include respond-below(md) {
    padding: var(--space-3);
  }
  
  @include respond-above(xl) {
    display: none;
  }
}

// =====================================
// 📱 移动端抽屉
// =====================================

:deep(.el-drawer) {
  .el-drawer__header {
    display: none;
  }
  
  .el-drawer__body {
    padding: 0;
    background: var(--bg-secondary);
  }
}

// =====================================
// ✨ 动画和过渡效果
// =====================================

.canvas-controls {
  .control-btn {
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      background: var(--color-primary-100);
      border-radius: var(--radius-full);
      transform: translate(-50%, -50%);
      transition: all var(--duration-fast) var(--ease-out);
      z-index: -1;
    }
    
    &:hover::before {
      width: 100%;
      height: 100%;
    }
  }
}

// 工具栏悬浮动画
.toolbar-area {
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.1) 50%, 
      transparent 100%
    );
    transition: left var(--duration-slow) var(--ease-out);
  }
  
  &:hover::before {
    left: 100%;
  }
}

// 品牌Logo动画
.app-logo {
  .logo-icon {
    animation: logo-pulse 3s ease-in-out infinite;
  }
}

@keyframes logo-pulse {
  0%, 100% {
    box-shadow: var(--shadow-colored);
  }
  50% {
    box-shadow: var(--shadow-xl);
    transform: scale(1.02);
  }
}
</style>