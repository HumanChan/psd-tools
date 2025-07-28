// PSD文件数据类型定义

export interface LayerBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface LayerData {
  id: string
  name: string
  type: 'image' | 'text' | 'shape' | 'group'
  visible: boolean
  opacity: number
  blendMode: string
  bounds: LayerBounds
  canvas?: HTMLCanvasElement | null
  imageData?: ImageData | null
  children: LayerData[]
}

export interface PSDMetadata {
  version: number
  hasTransparency: boolean
  layerCount: number
  createTime: Date
  fileType: string
}

export interface PSDData {
  // 基本信息
  name: string
  width: number
  height: number
  channels: number
  bitsPerChannel: number
  colorMode: number
  resolution: number
  fileSize: number
  
  // 图像数据
  compositeImage?: HTMLCanvasElement | null
  compositeImageData?: ImageData | null
  
  // 图层数据
  layers: LayerData[]
  
  // 元数据
  metadata: PSDMetadata
}

// ag-psd 库类型扩展
export interface AgPsdLayer {
  name?: string
  visible?: boolean
  opacity?: number
  blendMode?: string
  left?: number
  top?: number
  right?: number
  bottom?: number
  canvas?: HTMLCanvasElement
  imageData?: ImageData
  children?: AgPsdLayer[]
  text?: any
  vectorMask?: any
  mask?: any
}

// 应用状态类型
export interface AppState {
  currentFile: PSDData | null
  selectedLayer: LayerData | null
  visibleLayers: string[]
  loading: boolean
  error: string | null
}

// UI状态类型
export interface UIState {
  sidebarCollapsed: boolean
  showInfoPanel: boolean
  showMobileDrawer: boolean
  currentScale: number
  viewportOffset: { x: number; y: number }
}

// 文件上传相关类型
export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadError {
  code: string
  message: string
}

// 导出类型
export type FileFormat = 'png' | 'jpg' | 'webp' | 'json'
export type ExportOptions = {
  format: FileFormat
  quality?: number
  transparent?: boolean
  scale?: number
}