<template>
  <div class="theme-switcher">
    <!-- 简单切换按钮 -->
    <el-button
      v-if="variant === 'simple'"
      :icon="getIconComponent(themeIcon)"
      :type="buttonType"
      :size="size"
      :circle="circle"
      @click="handleThemeToggle"
      class="theme-toggle-btn"
      :title="themeLabel"
    />
    
    <!-- 下拉选择器 -->
    <el-dropdown
      v-else-if="variant === 'dropdown'"
      @command="setTheme"
      class="theme-dropdown"
    >
      <el-button 
        :type="buttonType" 
        :size="size"
        class="theme-dropdown-trigger"
      >
        <el-icon class="theme-icon">
          <component :is="getIconComponent(themeIcon)" />
        </el-icon>
        <span class="theme-label">{{ themeLabel }}</span>
        <el-icon class="dropdown-arrow">
          <ArrowDown />
        </el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu class="theme-dropdown-menu">
          <el-dropdown-item 
            command="light"
            :class="{ 'is-active': currentTheme === 'light' }"
            class="theme-option"
          >
            <el-icon><Sunny /></el-icon>
            <span>明亮模式</span>
          </el-dropdown-item>
          
          <el-dropdown-item 
            command="dark"
            :class="{ 'is-active': currentTheme === 'dark' }"
            class="theme-option"
          >
            <el-icon><Moon /></el-icon>
            <span>暗黑模式</span>
          </el-dropdown-item>
          
          <el-dropdown-item 
            command="auto"
            :class="{ 'is-active': currentTheme === 'auto' }"
            class="theme-option"
          >
            <el-icon><Monitor /></el-icon>
            <span>跟随系统</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <!-- 分段控制器 -->
    <div v-else-if="variant === 'segmented'" class="theme-segmented">
      <div class="segmented-control">
        <div 
          class="segmented-option"
          :class="{ 'is-active': currentTheme === 'light' }"
          @click="setTheme('light')"
        >
          <el-icon><Sunny /></el-icon>
        </div>
        
        <div 
          class="segmented-option"
          :class="{ 'is-active': currentTheme === 'dark' }"
          @click="setTheme('dark')"
        >
          <el-icon><Moon /></el-icon>
        </div>
        
        <div 
          class="segmented-option"
          :class="{ 'is-active': currentTheme === 'auto' }"
          @click="setTheme('auto')"
        >
          <el-icon><Monitor /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Sunny, 
  Moon, 
  Monitor, 
  ArrowDown 
} from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'

// 组件属性
interface Props {
  variant?: 'simple' | 'dropdown' | 'segmented'
  size?: 'large' | 'default' | 'small'
  buttonType?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text' | ''
  circle?: boolean
  toggleMode?: 'cycle' | 'lightDark'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'simple',
  size: 'default',
  buttonType: '',
  circle: false,
  toggleMode: 'lightDark'
})

// 使用主题管理
const {
  currentTheme,
  themeIcon,
  themeLabel,
  setTheme,
  toggleTheme,
  toggleLightDark
} = useTheme()

// 图标组件映射
const getIconComponent = (iconName: string) => {
  const iconMap = {
    Sunny,
    Moon,
    Monitor
  }
  return iconMap[iconName as keyof typeof iconMap] || Sunny
}

// 主题切换处理
const handleThemeToggle = () => {
  if (props.toggleMode === 'cycle') {
    toggleTheme()
  } else {
    toggleLightDark()
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/themes.scss';

.theme-switcher {
  display: inline-flex;
  align-items: center;
}

// 简单按钮样式
.theme-toggle-btn {
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  // 主题切换动画
  .el-icon {
    transition: all var(--duration-normal) var(--ease-in-out);
  }
}

// 下拉选择器样式
.theme-dropdown {
  .theme-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    
    .theme-icon {
      font-size: var(--font-size-lg);
    }
    
    .theme-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
    }
    
    .dropdown-arrow {
      font-size: var(--font-size-sm);
      opacity: 0.7;
      transition: transform var(--duration-normal) var(--ease-out);
    }
    
    &:hover .dropdown-arrow {
      transform: rotate(180deg);
    }
  }
}

:deep(.theme-dropdown-menu) {
  @include glass-morphism;
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  min-width: 160px;
  box-shadow: var(--shadow-xl);
  
  .theme-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-out);
    cursor: pointer;
    
    &:hover {
      background: var(--color-primary-50);
      color: var(--color-primary-700);
    }
    
    &.is-active {
      background: var(--color-primary-100);
      color: var(--color-primary-700);
      font-weight: var(--font-weight-medium);
      
      .el-icon {
        color: var(--color-primary-600);
      }
    }
    
    .el-icon {
      font-size: var(--font-size-lg);
    }
    
    span {
      font-size: var(--font-size-sm);
    }
  }
}

// 分段控制器样式
.theme-segmented {
  .segmented-control {
    display: flex;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    padding: var(--space-1);
    border: 1px solid var(--border-primary);
    @include glass-morphism(0.3);
    
    .segmented-option {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--duration-normal) var(--ease-out);
      position: relative;
      min-width: 40px;
      height: 36px;
      
      .el-icon {
        font-size: var(--font-size-lg);
        color: var(--text-tertiary);
        transition: all var(--duration-normal) var(--ease-out);
      }
      
      &:hover {
        background: var(--color-neutral-200);
        
        .el-icon {
          color: var(--text-secondary);
          transform: scale(1.1);
        }
      }
      
      &.is-active {
        background: var(--bg-elevated);
        box-shadow: var(--shadow-sm);
        
        .el-icon {
          color: var(--color-primary-600);
        }
        
        &::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--color-primary-600);
          border-radius: var(--radius-full);
        }
      }
    }
  }
}

// 主题切换动画
.theme-switcher {
  .el-icon {
    transition: all var(--duration-normal) var(--ease-bounce);
  }
  
  &:hover .el-icon {
    transform: rotate(15deg) scale(1.05);
  }
}

// 暗黑模式特殊样式
.theme-dark {
  .theme-segmented .segmented-control {
    background: var(--color-neutral-100);
    border-color: var(--color-neutral-200);
    
    .segmented-option {
      &:hover {
        background: var(--color-neutral-200);
      }
      
      &.is-active {
        background: var(--color-neutral-50);
        box-shadow: var(--shadow-md);
      }
    }
  }
}

// 响应式适配
@include respond-below(md) {
  .theme-dropdown {
    .theme-dropdown-trigger {
      .theme-label {
        display: none;
      }
    }
  }
}
</style>