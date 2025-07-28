import { readPsd, Psd } from 'ag-psd'
import type { LayerData, PSDData } from '@/types/psd'

/**
 * PSD解析工具类
 * 基于ag-psd库实现PSD文件解析
 */
export class PSDParser {
  /**
   * 解析PSD文件
   * @param file PSD文件对象
   * @returns Promise<PSDData> 解析后的PSD数据
   */
  static async parsePSDFile(file: File): Promise<PSDData> {
    console.log('🚀 开始解析PSD文件:', file.name, 'size:', file.size)
    
    try {
      // 将文件转换为ArrayBuffer
      console.log('📥 读取文件为ArrayBuffer...')
      const arrayBuffer = await this.fileToArrayBuffer(file)
      console.log('📥 ArrayBuffer读取完成, size:', arrayBuffer.byteLength)
      
      // 使用ag-psd解析
      console.log('⚙️ 调用ag-psd解析器...')
      console.log('解析的PSD数据:', {
        name: file.name,
        size: file.size,
        width: 0, // 这些将在解析后填充
        height: 0,
        resolution: 0
      })
      
      const psd = readPsd(arrayBuffer, {
        skipLayerImageData: false, // 不跳过图层图像数据
        skipCompositeImageData: false, // 不跳过合成图像数据
        skipThumbnail: false, // 不跳过缩略图
        useImageData: true, // 使用ImageData格式
        useRawThumbnail: false
      })
      
      console.log('✅ ag-psd解析完成')
      console.log('图层数量:', psd.children?.length || 0)
      console.log('合成图像:', !!psd.canvas)
      console.log('图像数据:', !!psd.imageData)

      // 转换为标准化数据格式
      const result = this.convertPSDData(psd, file)
      console.log('✅ 数据转换完成，返回结果')
      
      return result
    } catch (error) {
      console.error('❌ PSD解析失败:', error)
      throw new Error(`PSD文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 将File对象转换为ArrayBuffer
   */
  private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result)
        } else {
          reject(new Error('读取文件失败'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取错误'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 转换ag-psd数据为标准化格式
   */
  private static convertPSDData(psd: Psd, file: File): PSDData {
    console.log('🔄 [DEBUG-CONVERT] PSD原始数据:', psd)
    
    const result = {
      // 基本信息
      name: file.name,
      width: psd.width,
      height: psd.height,
      channels: psd.channels || 4,
      bitsPerChannel: psd.bitsPerChannel || 8,
      colorMode: psd.colorMode || 3, // RGB
      resolution: psd.resolution || 72,
      fileSize: file.size,
      
      // 合成图像 - ag-psd通常会生成canvas
      compositeImage: psd.canvas || null,
      compositeImageData: psd.imageData || null,
      
      // 图层数据
      layers: this.convertLayers(psd.children || []),
      
      // 元数据
      metadata: {
        version: psd.version || 1,
        hasTransparency: this.hasTransparency(psd),
        layerCount: this.countLayers(psd.children || []),
        createTime: new Date(),
        fileType: 'PSD'
      }
    }
    
    console.log('📋 [DEBUG-CONVERT] 转换后的数据结构:', {
      name: result.name,
      dimensions: `${result.width}x${result.height}`,
      hasCompositeImage: !!result.compositeImage,
      hasCompositeImageData: !!result.compositeImageData,
      layerCount: result.layers.length,
      layers: result.layers.map(l => ({
        name: l.name,
        type: l.type,
        hasCanvas: !!l.canvas,
        hasImageData: !!l.imageData,
        bounds: l.bounds
      }))
    })
    
    return result
  }

  /**
   * 转换图层数据
   */
  private static convertLayers(children: any[]): LayerData[] {
    console.log(`🔄 [DEBUG-LAYERS] 开始转换 ${children.length} 个图层`)
    const layers: LayerData[] = []
    
    for (let i = 0; i < children.length; i++) {
      const layer = children[i]
      console.log(`🔍 [DEBUG-LAYERS] 处理图层 ${i}:`, {
        name: layer.name,
        hasCanvas: !!layer.canvas,
        hasImageData: !!layer.imageData,
        bounds: {
          left: layer.left,
          top: layer.top,
          right: layer.right,
          bottom: layer.bottom
        },
        visible: layer.visible,
        opacity: layer.opacity
      })
      
      const layerData: LayerData = {
        id: `layer_${i}_${Date.now()}`,
        name: layer.name || `图层 ${i + 1}`,
        type: this.getLayerType(layer),
        visible: layer.visible !== false,
        opacity: layer.opacity !== undefined ? layer.opacity / 255 : 1,
        blendMode: layer.blendMode || 'normal',
        bounds: {
          left: layer.left || 0,
          top: layer.top || 0,
          right: layer.right || 0,
          bottom: layer.bottom || 0,
          width: (layer.right || 0) - (layer.left || 0),
          height: (layer.bottom || 0) - (layer.top || 0)
        },
        canvas: layer.canvas || null,
        imageData: layer.imageData || null,
        children: layer.children ? this.convertLayers(layer.children) : []
      }
      
      console.log(`✅ [DEBUG-LAYERS] 图层转换完成 "${layerData.name}":`, {
        type: layerData.type,
        bounds: layerData.bounds,
        hasCanvas: !!layerData.canvas,
        hasImageData: !!layerData.imageData,
        visible: layerData.visible,
        opacity: layerData.opacity
      })
      
      layers.push(layerData)
    }
    
    console.log(`✅ [DEBUG-LAYERS] 全部图层转换完成，共 ${layers.length} 个`)
    return layers
  }

  /**
   * 获取图层类型
   */
  private static getLayerType(layer: any): string {
    if (layer.children && layer.children.length > 0) {
      return 'group'
    }
    if (layer.text) {
      return 'text'
    }
    if (layer.vectorMask || layer.mask) {
      return 'shape'
    }
    return 'image'
  }

  /**
   * 检查是否有透明度
   */
  private static hasTransparency(psd: Psd): boolean {
    return psd.channels === 4 || (psd.children && psd.children.some(layer => layer.opacity < 255))
  }

  /**
   * 计算图层总数（包括嵌套图层）
   */
  private static countLayers(children: any[]): number {
    let count = 0
    for (const child of children) {
      count++
      if (child.children) {
        count += this.countLayers(child.children)
      }
    }
    return count
  }

  /**
   * 生成缩略图
   * @param psd PSD数据
   * @param maxSize 最大尺寸
   * @returns HTMLCanvasElement 缩略图canvas
   */
  static generateThumbnail(psd: PSDData, maxSize: number = 200): HTMLCanvasElement | null {
    if (!psd.compositeImage) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 计算缩略图尺寸
    const { width, height } = this.calculateThumbnailSize(psd.width, psd.height, maxSize)
    canvas.width = width
    canvas.height = height

    // 绘制缩略图
    ctx.drawImage(psd.compositeImage, 0, 0, width, height)
    
    return canvas
  }

  /**
   * 计算缩略图尺寸
   */
  private static calculateThumbnailSize(width: number, height: number, maxSize: number) {
    const ratio = Math.min(maxSize / width, maxSize / height)
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    }
  }

  /**
   * 验证PSD文件格式
   */
  static validatePSDFile(file: File): { valid: boolean; error?: string } {
    // 检查文件扩展名
    if (!file.name.toLowerCase().endsWith('.psd')) {
      return { valid: false, error: '文件必须是.psd格式' }
    }

    // 检查文件大小（50MB限制）
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { valid: false, error: '文件大小不能超过50MB' }
    }

    // 检查最小文件大小（避免空文件）
    if (file.size < 1024) {
      return { valid: false, error: '文件大小异常，可能不是有效的PSD文件' }
    }

    return { valid: true }
  }
}

/**
 * 导出便捷函数
 */
export const parsePSD = PSDParser.parsePSDFile
export const validatePSD = PSDParser.validatePSDFile
export const generateThumbnail = PSDParser.generateThumbnail