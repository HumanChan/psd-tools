<template>
  <div class="file-upload-container">
    <el-upload
      ref="uploadRef"
      class="upload-dragger"
      :class="{ 'mobile-upload': isMobile }"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept=".psd"
      :limit="1"
      :on-change="handleFileChange"
      :on-exceed="handleExceed"
      :before-upload="beforeUpload"
    >
      <div class="upload-content">
        <el-icon class="upload-icon" :size="isMobile ? 40 : 60">
          <Upload />
        </el-icon>
        <div class="upload-text">
          <div class="primary-text">
            {{ isMobile ? '点击上传PSD文件' : '将PSD文件拖到此处，或点击上传' }}
          </div>
          <div class="secondary-text">
            {{ isMobile ? '支持.psd格式' : '支持.psd格式，文件大小不超过20MB' }}
          </div>
        </div>
      </div>
    </el-upload>

    <!-- 文件信息显示 -->
    <div v-if="currentFile" class="file-info">
      <div class="file-name">{{ currentFile.name }}</div>
      <div class="file-size">{{ formatFileSize(currentFile.size) }}</div>
      <div class="file-actions">
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          {{ uploading ? '解析中...' : '解析PSD' }}
        </el-button>
        <el-button @click="clearFile">清除</el-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <el-alert
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles, UploadInstance } from 'element-plus'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import { parsePSD } from '@/utils/psdParser'

// Props & Emits
interface FileUploadProps {
  maxSize?: number // MB
}

const props = withDefaults(defineProps<FileUploadProps>(), {
  maxSize: 20
})

const emit = defineEmits<{
  fileSelected: [file: File]
  uploadStart: []
  uploadSuccess: [data: any]
  uploadError: [error: string]
}>()

// Composables
const { isMobile } = useResponsiveLayout()

// Refs
const uploadRef = ref<UploadInstance>()
const currentFile = ref<File | null>(null)
const uploading = ref(false)
const error = ref('')

// Methods
const handleFileChange = (file: UploadFile, files: UploadFiles) => {
  // 清除之前的错误
  error.value = ''
  
  if (file.raw) {
    currentFile.value = file.raw
    emit('fileSelected', file.raw)
  }
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个PSD文件')
}

const beforeUpload = (file: File) => {
  // 检查文件类型
  const isPsd = file.name.toLowerCase().endsWith('.psd')
  if (!isPsd) {
    error.value = '请上传.psd格式的文件'
    return false
  }

  // 检查文件大小
  const isLtMaxSize = file.size / 1024 / 1024 < props.maxSize
  if (!isLtMaxSize) {
    error.value = `文件大小不能超过${props.maxSize}MB`
    return false
  }

  return true
}

const handleUpload = async () => {
  if (!currentFile.value) return

  console.log('🚀 [DEBUG-UPLOAD] 开始上传文件:', currentFile.value.name, currentFile.value.size)

  try {
    uploading.value = true
    error.value = ''
    emit('uploadStart')

    console.log('🔍 [DEBUG-UPLOAD] 调用PSD解析器...')
    // 调用真实的PSD解析
    const result = await parsePSD(currentFile.value)
    console.log('✅ [DEBUG-UPLOAD] PSD解析成功:', result)
    
    emit('uploadSuccess', result)
    ElMessage.success('PSD文件解析成功')
    
  } catch (err) {
    console.error('❌ [DEBUG-UPLOAD] PSD解析失败:', err)
    const errorMessage = err instanceof Error ? err.message : '文件解析失败'
    error.value = errorMessage
    emit('uploadError', errorMessage)
    ElMessage.error(errorMessage)
  } finally {
    uploading.value = false
    console.log('🏁 [DEBUG-UPLOAD] 上传流程结束')
  }
}

const clearFile = () => {
  currentFile.value = null
  error.value = ''
  uploadRef.value?.clearFiles()
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
.file-upload-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 15px;
  }
}

.upload-dragger {
  :deep(.el-upload-dragger) {
    width: 100%;
    height: 200px;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    @media (max-width: 768px) {
      height: 150px;
    }
  }

  &.mobile-upload {
    :deep(.el-upload-dragger) {
      border-style: solid;
      border-width: 1px;
    }
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 12px;
  }
}

.upload-icon {
  color: var(--el-color-primary);
}

.upload-text {
  text-align: center;

  .primary-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;

    @media (max-width: 768px) {
      font-size: 14px;
      margin-bottom: 4px;
    }
  }

  .secondary-text {
    font-size: 14px;
    color: var(--el-text-color-secondary);

    @media (max-width: 768px) {
      font-size: 12px;
    }
  }
}

.file-info {
  margin-top: 20px;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color);

  @media (max-width: 768px) {
    margin-top: 15px;
    padding: 12px;
  }

  .file-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
    word-break: break-all;

    @media (max-width: 768px) {
      font-size: 14px;
      margin-bottom: 6px;
    }
  }

  .file-size {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin-bottom: 16px;

    @media (max-width: 768px) {
      font-size: 12px;
      margin-bottom: 12px;
    }
  }

  .file-actions {
    display: flex;
    gap: 12px;

    @media (max-width: 480px) {
      flex-direction: column;
      gap: 8px;

      .el-button {
        width: 100%;
      }
    }
  }
}

.error-message {
  margin-top: 16px;

  @media (max-width: 768px) {
    margin-top: 12px;
  }
}
</style>