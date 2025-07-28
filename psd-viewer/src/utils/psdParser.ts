import { readPsd } from 'ag-psd'
import type { Psd, Layer } from 'ag-psd'
import type { PSDFile, PSDLayer } from '@/stores/psd'

/**
 * PSD解析器类
 * 负责解析PSD文件并转换为应用程序可用的数据格式
 */
export class PSDParser {
  private static instance: PSDParser
  
  private constructor() {}
  
  /**
   * 获取PSD解析器实例 (单例模式)
   */
  public static getInstance(): PSDParser {
    if (!PSDParser.instance) {
      PSDParser.instance = new PSDParser()
    }
    return PSDParser.instance
  }

  /**
   * 解析PSD文件
   * @param file - 要解析的PSD文件
   * @param options - 解析选项
   */
  public async parsePSDFile(
    file: File,
    options: PSDParseOptions = {}
  ): Promise<PSDFile> {
    try {
      // 验证文件
      this.validateFile(file)

      // 读取文件数据
      const arrayBuffer = await this.readFileAsArrayBuffer(file)
      
      // 使用ag-psd解析
      const psd = readPsd(arrayBuffer, {
        skipLayerImageData: options.skipLayerImageData || false,
        skipCompositeImageData: options.skipCompositeImageData || false,
        skipThumbnail: options.skipThumbnail || false,
        useImageData: options.useImageData || true,
        useRawThumbnail: options.useRawThumbnail || false,
        ...options.agPsdOptions
      })

      // 转换为应用程序格式
      return this.convertPsdToAppFormat(psd, file)

    } catch (error) {
      throw new PSDParseError(
        `PSD解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * 验证PSD文件
   */
  private validateFile(file: File): void {
    // 检查文件大小
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      throw new PSDParseError('文件过大，请选择小于100MB的PSD文件')
    }

    // 检查文件扩展名
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.psd', '.psb']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      throw new PSDParseError('不支持的文件格式，请选择PSD或PSB文件')
    }

    // 检查文件是否为空
    if (file.size === 0) {
      throw new PSDParseError('文件为空，请选择有效的PSD文件')
    }
  }

  /**
   * 读取文件为ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const result = event.target?.result
        if (result instanceof ArrayBuffer) {
          resolve(result)
        } else {
          reject(new Error('文件读取失败'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取错误'))
      }
      
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 将ag-psd的Psd对象转换为应用程序格式
   */
  private convertPsdToAppFormat(psd: Psd, originalFile: File): PSDFile {
    return {
      name: originalFile.name,
      size: originalFile.size,
      width: psd.width || 0,
      height: psd.height || 0,
      resolution: psd.imageResources?.resolutionInfo?.horizontalResolution || 72,
      colorMode: this.getColorModeString(psd.colorMode),
      layers: this.convertLayers(psd.children || []),
      thumbnail: this.generateThumbnail(psd)
    }
  }

  /**
   * 转换图层数据
   */
  private convertLayers(agPsdLayers: Layer[], parentPath = ''): PSDLayer[] {
    return agPsdLayers.map((layer, index) => {
      const layerId = `${parentPath}layer_${index}_${Date.now()}`
      const layerPath = parentPath ? `${parentPath}/${layer.name || 'Unnamed'}` : layer.name || 'Unnamed'

      const psdLayer: PSDLayer = {
        id: layerId,
        name: layer.name || `图层 ${index + 1}`,
        type: this.getLayerType(layer),
        visible: !layer.hidden,
        opacity: Math.round((layer.opacity || 255) / 255 * 100),
        left: layer.left || 0,
        top: layer.top || 0,
        width: (layer.right || 0) - (layer.left || 0),
        height: (layer.bottom || 0) - (layer.top || 0),
        thumbnail: this.generateLayerThumbnail(layer)
      }

      // 处理子图层 (图层组)
      if (layer.children && layer.children.length > 0) {
        psdLayer.children = this.convertLayers(layer.children, layerPath)
      }

      return psdLayer
    })
  }

  /**
   * 获取图层类型
   */
  private getLayerType(layer: Layer): string {
    if (layer.children && layer.children.length > 0) {
      return 'group'
    }
    
    if (layer.text) {
      return 'text'
    }
    
    if (layer.effects && layer.effects.length > 0) {
      return 'effect'
    }
    
    if (layer.mask) {
      return 'masked'
    }
    
    return 'normal'
  }

  /**
   * 获取颜色模式字符串
   */
  private getColorModeString(colorMode?: number): string {
    const colorModes: { [key: number]: string } = {
      0: 'Bitmap',
      1: 'Grayscale', 
      2: 'Indexed',
      3: 'RGB',
      4: 'CMYK',
      7: 'Multichannel',
      8: 'Duotone',
      9: 'Lab'
    }
    
    return colorModes[colorMode || 3] || 'RGB'
  }

  /**
   * 生成PSD文件缩略图
   */
  private generateThumbnail(psd: Psd): string | undefined {
    try {
      if (psd.imageData) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return undefined

        // 设置缩略图尺寸 (最大200x200)
        const maxSize = 200
        const scale = Math.min(maxSize / (psd.width || 1), maxSize / (psd.height || 1))
        
        canvas.width = Math.floor((psd.width || 0) * scale)
        canvas.height = Math.floor((psd.height || 0) * scale)

        // 创建ImageData并绘制
        const imageData = ctx.createImageData(canvas.width, canvas.height)
        
        // 这里需要将psd.imageData转换为ImageData
        // 由于ag-psd的imageData格式比较复杂，先返回undefined
        // 在后续版本中可以实现完整的缩略图生成
        
        return canvas.toDataURL('image/png')
      }
    } catch (error) {
      console.warn('生成缩略图失败:', error)
    }
    
    return undefined
  }

  /**
   * 生成图层缩略图
   */
  private generateLayerThumbnail(layer: Layer): string | undefined {
    try {
      if (layer.canvas) {
        // 如果图层有canvas数据，生成缩略图
        const maxSize = 64
        const originalWidth = layer.canvas.width
        const originalHeight = layer.canvas.height
        
        if (originalWidth === 0 || originalHeight === 0) return undefined
        
        const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight)
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return undefined
        
        canvas.width = Math.floor(originalWidth * scale)
        canvas.height = Math.floor(originalHeight * scale)
        
        ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height)
        
        return canvas.toDataURL('image/png')
      }
    } catch (error) {
      console.warn('生成图层缩略图失败:', error)
    }
    
    return undefined
  }
}

/**
 * PSD解析选项接口
 */
export interface PSDParseOptions {
  /** 跳过图层图像数据 */
  skipLayerImageData?: boolean
  /** 跳过合成图像数据 */
  skipCompositeImageData?: boolean
  /** 跳过缩略图 */
  skipThumbnail?: boolean
  /** 使用图像数据 */
  useImageData?: boolean
  /** 使用原始缩略图 */
  useRawThumbnail?: boolean
  /** ag-psd的其他选项 */
  agPsdOptions?: any
}

/**
 * PSD解析错误类
 */
export class PSDParseError extends Error {
  public readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'PSDParseError'
    this.originalError = originalError
  }
}

/**
 * PSD解析器实例
 */
export const psdParser = PSDParser.getInstance()

/**
 * 便捷的解析函数
 */
export async function parsePSDFile(
  file: File, 
  options?: PSDParseOptions
): Promise<PSDFile> {
  return psdParser.parsePSDFile(file, options)
}