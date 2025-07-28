# PSD预览工具产品需求文档 (PRD) - 简化版

## 1. 产品概述

### 1.1 产品名称
PSD Viewer - 简单PSD文件预览工具

### 1.2 产品定位
一款轻量级的Web PSD文件预览工具，专注于基础的文件查看和图层浏览功能。

### 1.3 目标用户
- 设计师：快速预览PSD文件
- 开发人员：查看设计稿的图层结构
- 普通用户：简单查看PSD文件内容

### 1.4 核心价值
- 无需安装Photoshop即可查看PSD文件
- 操作简单，加载快速
- 免费使用

## 2. 功能需求

### 2.1 文件上传
- **拖拽上传**：支持将PSD文件拖拽到指定区域
- **点击上传**：点击按钮选择本地PSD文件
- **文件验证**：验证PSD文件格式
- **上传进度**：显示文件上传进度

### 2.2 PSD预览
- **整体预览**：显示PSD文件的完整预览图
- **缩放功能**：鼠标滚轮缩放，显示缩放比例
- **平移功能**：鼠标拖拽平移视图
- **适应窗口**：一键适应窗口大小

### 2.3 图层管理
- **图层树**：以树形结构显示所有图层
- **图层信息**：显示图层名称、类型、尺寸
- **显示/隐藏**：点击眼睛图标控制图层显示
- **图层搜索**：按图层名称搜索

### 2.4 文件信息
- **基本信息**：文件名称、大小
- **画布信息**：画布尺寸、分辨率
- **图层统计**：总图层数、可见图层数

## 3. 技术方案

### 3.1 技术栈
- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI组件库**：Element Plus
- **PSD解析**：ag-psd
- **状态管理**：Pinia
- **样式处理**：SCSS

### 3.2 项目结构
```
psd-viewer/
├── public/
├── src/
│   ├── components/
│   │   ├── FileUpload.vue     # 文件上传组件
│   │   ├── PSDViewer.vue      # PSD预览组件
│   │   ├── LayerTree.vue      # 图层树组件
│   │   └── FileInfo.vue       # 文件信息组件
│   ├── stores/
│   │   └── psd.ts             # PSD状态管理
│   ├── utils/
│   │   └── psdParser.ts       # PSD解析工具
│   ├── App.vue
│   └── main.ts
├── package.json
└── vite.config.ts
```

### 3.3 核心模块

#### 3.3.1 文件上传模块
```vue
<el-upload
  class="upload-area"
  drag
  accept=".psd"
  :auto-upload="false"
  @change="handleFileSelect"
>
  <el-icon class="upload-icon"><Upload /></el-icon>
  <div class="upload-text">拖拽PSD文件到此处</div>
</el-upload>
```

#### 3.3.2 图层树组件
```vue
<el-tree
  :data="layers"
  node-key="id"
  :props="{ label: 'name', children: 'children' }"
>
  <template #default="{ data }">
    <div class="layer-item">
      <el-icon @click="toggleVisibility(data)">
        <View v-if="data.visible" />
        <Hide v-else />
      </el-icon>
      <span>{{ data.name }}</span>
    </div>
  </template>
</el-tree>
```

#### 3.3.3 预览画布
```vue
<div class="canvas-container">
  <div class="toolbar">
    <el-button @click="fitToScreen">适应屏幕</el-button>
    <span>缩放: {{ zoomLevel }}%</span>
  </div>
  <canvas ref="canvas" @wheel="handleZoom" @mousedown="handlePan"></canvas>
</div>
```

## 4. 响应式用户界面设计

### 4.1 全屏响应式布局系统

#### 4.1.1 桌面端布局 (≥1200px)
```
┌─────────────────────────────────────────────────────────┐
│                    顶部工具栏 (60px)                     │
├────────────┬─────────────────────────┬──────────────────┤
│   图层面板   │      PSD预览画布         │    信息面板      │
│   (320px)   │    (flex: 1, 填满剩余)    │    (280px)      │
│            │                         │                 │
│   可收缩     │     填满整个视口         │     可收缩       │
│            │                         │                 │
└────────────┴─────────────────────────┴──────────────────┘
```

#### 4.1.2 平板端布局 (768px-1199px) 
```
┌─────────────────────────────────────────────────────────┐
│                    顶部工具栏 (60px)                     │
├────────────┬─────────────────────────────────────────────┤
│   图层面板   │            PSD预览画布                     │
│   (280px)   │           (flex: 1, 填满剩余)               │
│   可折叠     │                                           │
├────────────┴─────────────────────────────────────────────┤
│                  底部信息栏 (120px)                      │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.3 移动端布局 (<768px)
```
┌─────────────────────────────────────────────────────────┐
│                 顶部工具栏 (50px)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              PSD预览画布                                │
│            (填满整个视口)                                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│              底部抽屉式面板                               │
│        (可滑动展开图层和信息面板)                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 CSS Grid + Flexbox 实现方案
```scss
.app-layout {
  height: 100vh;
  width: 100vw;
  display: grid;
  
  // 桌面端网格布局
  @media (min-width: 1200px) {
    grid-template-columns: 320px 1fr 280px;
    grid-template-rows: 60px 1fr;
    grid-template-areas:
      "toolbar toolbar toolbar"
      "sidebar canvas panel";
  }
  
  // 平板端网格布局
  @media (min-width: 768px) and (max-width: 1199px) {
    grid-template-columns: 280px 1fr;
    grid-template-rows: 60px 1fr 120px;
    grid-template-areas:
      "toolbar toolbar"
      "sidebar canvas"
      "info info";
  }
  
  // 移动端网格布局
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    grid-template-rows: 50px 1fr auto;
    grid-template-areas:
      "toolbar"
      "canvas"
      "drawer";
  }
}

.toolbar { grid-area: toolbar; }
.sidebar { grid-area: sidebar; }
.canvas { grid-area: canvas; }
.panel { grid-area: panel; }
.info { grid-area: info; }
.drawer { grid-area: drawer; }
```

### 4.3 Element Plus响应式组件使用

#### 4.3.1 响应式侧边栏
```vue
<el-drawer
  v-model="sidebarVisible"
  :with-header="false"
  :modal="isMobile"
  :size="sidebarWidth"
  direction="ltr"
>
  <el-tree
    :data="layers"
    node-key="id"
    virtual-scroll
    :height="treeHeight"
  />
</el-drawer>
```

#### 4.3.2 响应式工具栏
```vue
<el-row class="toolbar" justify="space-between" align="middle">
  <el-col :xs="8" :sm="6" :md="4">
    <el-button 
      v-if="isMobile" 
      @click="toggleSidebar"
      :icon="Menu"
    />
    <span class="app-title">PSD Viewer</span>
  </el-col>
  
  <el-col :xs="16" :sm="12" :md="16">
    <el-button-group class="canvas-controls">
      <el-button @click="fitToScreen" :icon="FullScreen" />
      <el-button @click="actualSize" :icon="ScaleToOriginal" />
    </el-button-group>
  </el-col>
  
  <el-col :xs="0" :sm="6" :md="4">
    <span class="zoom-info">{{ zoomLevel }}%</span>
  </el-col>
</el-row>
```

### 4.4 触摸设备优化
- **触摸缩放**：支持双指捏合缩放
- **触摸平移**：支持单指拖拽平移  
- **触摸选择**：优化图层点击区域大小
- **手势支持**：支持常用手势操作

### 4.5 视口适配策略
```javascript
// 响应式断点管理
export const breakpoints = {
  xs: 0,     // 手机
  sm: 576,   // 小平板
  md: 768,   // 平板
  lg: 992,   // 小桌面
  xl: 1200,  // 桌面
  xxl: 1600  // 大屏
}

// 动态计算布局尺寸
export const useResponsiveLayout = () => {
  const screenWidth = ref(window.innerWidth)
  
  const isMobile = computed(() => screenWidth.value < breakpoints.md)
  const isTablet = computed(() => 
    screenWidth.value >= breakpoints.md && 
    screenWidth.value < breakpoints.xl
  )
  const isDesktop = computed(() => screenWidth.value >= breakpoints.xl)
  
  const sidebarWidth = computed(() => {
    if (isMobile.value) return '100%'
    if (isTablet.value) return '280px'
    return '320px'
  })
  
  return {
    isMobile,
    isTablet, 
    isDesktop,
    sidebarWidth
  }
}
```

## 5. 性能要求

### 5.1 文件支持
- 支持PSD文件格式
- 最大文件大小：20MB
- 兼容Photoshop CS6+版本

### 5.2 性能指标
- 文件解析时间：< 3秒
- 页面响应时间：< 100ms
- 支持1000个图层以内的文件

### 5.3 浏览器兼容
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 6. 开发计划

### 6.1 第一周
- 项目初始化和基础架构搭建
- 文件上传功能实现

### 6.2 第二周
- PSD解析功能集成
- 基础预览功能实现

### 6.3 第三周
- 图层树展示功能
- 缩放和平移功能

### 6.4 第四周
- UI优化和测试
- 部署上线

## 7. 风险评估

### 7.1 技术风险
- PSD文件格式复杂，可能存在解析兼容性问题
- 大文件可能导致浏览器卡顿

### 7.2 解决方案
- 使用成熟的ag-psd解析库
- 添加文件大小限制
- 实现基础的错误处理

---

**文档版本**：v2.0 (简化版)  
**创建日期**：2024年12月  
**预计开发时间**：4周