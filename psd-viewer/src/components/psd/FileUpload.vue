<template>
  <div class="file-upload-container">
    <!-- 主上传区域 -->
    <el-upload
      ref="uploadRef"
      class="psd-uploader"
      drag
      :auto-upload="false"
      :show-file-list="false"
      :accept="acceptedFormats"
      :before-upload="beforeUpload"
      :on-change="handleFileChange"
      :on-exceed="handleExceed"
      :limit="1"
      multiple="false"
    >
      <div class="upload-area" :class="{ 'upload-active': isDragOver }">
        <!-- 上传图标和提示 -->
        <div v-if="!uploading && !uploadProgress" class="upload-content">
          <el-icon class="upload-icon" :size="64">
            <Upload />
          </el-icon>
          <div class="upload-text">
            <h3 class="upload-title">{{ uploadTitle }}</h3>
            <p class="upload-hint">{{ uploadHint }}</p>
            <p class="upload-format">支持格式：PSD, PSB (最大 {{ maxSizeMB }}MB)</p>
          </div>
        </div>

        <!-- 上传进度 -->
        <div v-if="uploading || uploadProgress > 0" class="upload-progress">
          <el-icon class="progress-icon" :size="48">
            <Loading />
          </el-icon>
          <div class="progress-content">
            <h4 class="progress-title">{{ progressText }}</h4>
            <el-progress 
              :percentage="uploadProgress"
              :format="formatProgress"
              status="success"
              :show-text="true"
            />
            <p class="progress-info">{{ currentFileName }}</p>
          </div>
        </div>
      </div>

      <!-- 移动端优化按钮 -->
      <template #trigger>
        <el-button 
          v-if="isMobile" 
          type="primary" 
          size="large" 
          class="mobile-upload-btn"
          :loading="uploading"
        >
          <el-icon><Upload /></el-icon>
          选择PSD文件
        </el-button>
      </template>
    </el-upload>

    <!-- 错误提示 -->
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="true"
      @close="clearError"
      class="upload-error"
    />

    <!-- 文件信息预览 -->
    <div v-if="selectedFile && !uploading" class="file-preview">
      <el-card class="preview-card">
        <div class="file-info">
          <el-icon class="file-icon"><Document /></el-icon>
          <div class="file-details">
            <h4 class="file-name">{{ selectedFile.name }}</h4>
            <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <div class="file-actions">
            <el-button 
              type="primary" 
              @click="startProcessing"
              :loading="processing"
              size="default"
            >
              开始解析
            </el-button>
            <el-button 
              type="text" 
              @click="clearFile"
              size="default"
            >
              重新选择
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Upload, Loading, Document } from '@element-plus/icons-vue'
import { ElMessage, type UploadInstance, type UploadFile, type UploadRawFile } from 'element-plus'
import { useResponsiveLayout } from '@/composables/useResponsive'
import { usePSDStore } from '@/stores/psd'
import { parsePSDFile, PSDParseError } from '@/utils/psdParser'

// 响应式布局
const { isMobile, isTablet } = useResponsiveLayout()

// PSD状态管理
const psdStore = usePSDStore()

// 组件引用
const uploadRef = ref<UploadInstance>()

// 状态管理
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const processing = ref(false)
const uploadProgress = ref(0)
const errorMessage = ref('')
const isDragOver = ref(false)
const currentFileName = ref('')

// 配置常量
const maxSizeMB = 20
const maxSizeBytes = maxSizeMB * 1024 * 1024
const acceptedFormats = '.psd,.psb'
const acceptedMimeTypes = ['image/vnd.adobe.photoshop', 'application/octet-stream']

// 计算属性
const uploadTitle = computed(() => {
  if (isMobile.value) return '选择PSD文件'
  return '拖拽PSD文件到此处'
})

const uploadHint = computed(() => {
  if (isMobile.value) return '点击下方按钮选择文件'
  return '或点击选择文件'
})

const progressText = computed(() => {
  if (uploadProgress.value < 100) return '文件上传中...'
  if (processing.value) return '解析PSD文件...'
  return '处理完成'
})

// 文件验证
const validateFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件扩展名
  const fileName = file.name.toLowerCase()
  const validExtensions = ['.psd', '.psb']
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
  
  if (!hasValidExtension) {
    return { valid: false, error: '只支持 PSD 和 PSB 格式的文件' }
  }

  // 检查文件大小
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `文件大小不能超过 ${maxSizeMB}MB` }
  }

  // 检查文件是否为空
  if (file.size === 0) {
    return { valid: false, error: '文件不能为空' }
  }

  return { valid: true }
}

// 上传前验证
const beforeUpload = (rawFile: UploadRawFile) => {
  const validation = validateFile(rawFile)
  if (!validation.valid) {
    errorMessage.value = validation.error || '文件验证失败'
    return false
  }
  return true
}

// 文件选择处理
const handleFileChange = (uploadFile: UploadFile) => {
  clearError()
  
  if (!uploadFile.raw) return

  const validation = validateFile(uploadFile.raw)
  if (!validation.valid) {
    errorMessage.value = validation.error || '文件验证失败'
    return
  }

  selectedFile.value = uploadFile.raw
  currentFileName.value = uploadFile.name
  
  // 模拟上传进度
  simulateUpload()
}

// 文件数量限制处理
const handleExceed = () => {
  ElMessage.warning('一次只能上传一个PSD文件')
}

// 模拟上传进度
const simulateUpload = () => {
  uploading.value = true
  uploadProgress.value = 0

  const progressInterval = setInterval(() => {
    uploadProgress.value += Math.random() * 10
    
    if (uploadProgress.value >= 100) {
      uploadProgress.value = 100
      clearInterval(progressInterval)
      uploading.value = false
      
      // 延迟一下显示文件预览
      setTimeout(() => {
        uploadProgress.value = 0
      }, 500)
    }
  }, 100)
}

// 开始处理PSD文件
const startProcessing = async () => {
  if (!selectedFile.value) return

  processing.value = true
  psdStore.setLoading(true)

  try {
    // 使用真实的PSD解析器
    const psdData = await parsePSDFile(selectedFile.value, {
      skipLayerImageData: false,
      skipCompositeImageData: false,
      useImageData: true
    })
    
    console.log('解析的PSD数据:', psdData)
    console.log('图层数量:', psdData.layers.length)
    
    psdStore.setCurrentFile(psdData)
    ElMessage.success(`PSD文件解析成功！共${psdData.layers.length}个图层`)
    
  } catch (error) {
    let errorMsg = '解析失败'
    
    if (error instanceof PSDParseError) {
      errorMsg = error.message
    } else if (error instanceof Error) {
      errorMsg = `解析失败: ${error.message}`
    }
    
    errorMessage.value = errorMsg
    psdStore.setError(errorMsg)
    ElMessage.error(errorMsg)
  } finally {
    processing.value = false
    psdStore.setLoading(false)
  }
}

// 清除文件
const clearFile = () => {
  selectedFile.value = null
  uploadProgress.value = 0
  uploading.value = false
  processing.value = false
  currentFileName.value = ''
  clearError()
  uploadRef.value?.clearFiles()
}

// 清除错误
const clearError = () => {
  errorMessage.value = ''
  psdStore.setError(null)
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化进度
const formatProgress = (percentage: number): string => {
  return percentage === 100 ? '完成' : `${percentage.toFixed(0)}%`
}

// 拖拽事件处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

// 生命周期
onMounted(() => {
  // 添加全局拖拽事件监听
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('dragleave', handleDragLeave)
  document.addEventListener('drop', handleDrop)
})

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('dragleave', handleDragLeave)
  document.removeEventListener('drop', handleDrop)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.file-upload-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}

.psd-uploader {
  width: 100%;
  max-width: 600px;
  
  :deep(.el-upload) {
    width: 100%;
    border: none;
  }
  
  :deep(.el-upload-dragger) {
    width: 100%;
    height: auto;
    min-height: 300px;
    border: 2px dashed #dcdfe6;
    border-radius: 12px;
    background: #fafafa;
    transition: all 0.3s ease;
    padding: 40px 20px;
    
    &:hover {
      border-color: #409eff;
      background: #f0f9ff;
    }
    
    @include respond-below(md) {
      min-height: 200px;
      padding: 20px 16px;
    }
  }
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  
  &.upload-active {
    :deep(.el-upload-dragger) {
      border-color: #67c23a;
      background: #f0f9ff;
    }
  }
}

.upload-content {
  text-align: center;
  
  .upload-icon {
    color: #909399;
    margin-bottom: 16px;
    
    @include respond-below(md) {
      font-size: 48px !important;
    }
  }
  
  .upload-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;
    
    @include respond-below(md) {
      font-size: 16px;
    }
  }
  
  .upload-hint {
    font-size: 14px;
    color: #606266;
    margin: 0 0 4px 0;
  }
  
  .upload-format {
    font-size: 12px;
    color: #909399;
    margin: 0;
  }
}

.upload-progress {
  text-align: center;
  width: 100%;
  max-width: 400px;
  
  .progress-icon {
    color: #409eff;
    margin-bottom: 16px;
    animation: rotate 2s linear infinite;
  }
  
  .progress-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
  }
  
  .progress-info {
    font-size: 12px;
    color: #909399;
    margin: 8px 0 0 0;
    word-break: break-all;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mobile-upload-btn {
  margin-top: 16px;
  width: 200px;
  
  @include respond-below(md) {
    width: 100%;
    max-width: 300px;
  }
}

.upload-error {
  margin-top: 16px;
  max-width: 600px;
}

.file-preview {
  margin-top: 24px;
  width: 100%;
  max-width: 600px;
  
  .preview-card {
    border-radius: 8px;
    
    :deep(.el-card__body) {
      padding: 20px;
    }
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 16px;
    
    @include respond-below(md) {
      flex-direction: column;
      text-align: center;
      gap: 12px;
    }
    
    .file-icon {
      font-size: 32px;
      color: #409eff;
      flex-shrink: 0;
    }
    
    .file-details {
      flex: 1;
      min-width: 0;
      
      .file-name {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0 0 4px 0;
        word-break: break-all;
      }
      
      .file-size {
        font-size: 14px;
        color: #606266;
        margin: 0;
      }
    }
    
    .file-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      
      @include respond-below(md) {
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style>