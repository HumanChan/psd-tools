# PSD Tools

一个简单的PSD预览工具，可以查看PSD文件的图层结构。

## 功能特性

- 🎨 PSD文件上传和解析
- 📁 图层树结构显示
- 🔍 图层搜索功能
- 📊 文件信息展示
- 📱 响应式布局设计

## 技术栈

- Vue 3
- TypeScript
- Element Plus
- Pinia
- Vite
- SCSS
- ag-psd

## 开发环境

```bash
# 安装依赖
cd psd-viewer
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
psd-tools/
├── docs/              # 项目文档
│   ├── PRD.md         # 产品需求文档
│   └── TODOLIST.md    # 任务清单
└── psd-viewer/        # Vue应用
    ├── src/
    │   ├── components/    # 组件
    │   ├── stores/       # 状态管理
    │   ├── utils/        # 工具函数
    │   └── styles/       # 样式文件
    └── public/           # 静态资源
```

## 使用说明

1. 打开应用
2. 拖拽或选择PSD文件上传
3. 点击"开始解析"
4. 在左侧查看图层结构
5. 在右侧查看文件信息

## 开发日志

- ✅ 基础框架搭建
- ✅ 文件上传功能
- ✅ PSD解析功能
- ✅ 图层树显示
- ✅ 响应式布局
- ⏳ Canvas预览功能开发中

## License

MIT