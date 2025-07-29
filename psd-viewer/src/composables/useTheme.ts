import { ref, computed, watch, onMounted, readonly } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

// 主题状态管理
const currentTheme = ref<Theme>('auto')
const systemTheme = ref<'light' | 'dark'>('light')

// 存储键名
const THEME_STORAGE_KEY = 'psd-viewer-theme'

/**
 * 🌓 主题管理组合式API
 * 提供主题切换、持久化存储和系统主题检测功能
 */
export function useTheme() {
  // 检测系统主题
  const detectSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // 计算实际应用的主题
  const resolvedTheme = computed(() => {
    if (currentTheme.value === 'auto') {
      return systemTheme.value
    }
    return currentTheme.value
  })

  // 应用主题到文档
  const applyTheme = (theme: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      
      // 移除之前的主题类
      root.classList.remove('theme-light', 'theme-dark')
      
      // 添加新的主题类
      root.classList.add(`theme-${theme}`)
      
      // 更新 Element Plus 主题
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  // 设置主题
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    
    // 持久化存储
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  }

  // 切换主题
  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  // 切换明暗主题（不包括auto）
  const toggleLightDark = () => {
    if (resolvedTheme.value === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  // 主题图标
  const themeIcon = computed(() => {
    switch (currentTheme.value) {
      case 'light':
        return 'Sunny'
      case 'dark':
        return 'Moon'
      case 'auto':
        return 'Monitor'
      default:
        return 'Sunny'
    }
  })

  // 主题标签
  const themeLabel = computed(() => {
    switch (currentTheme.value) {
      case 'light':
        return '明亮模式'
      case 'dark':
        return '暗黑模式'
      case 'auto':
        return '跟随系统'
      default:
        return '明亮模式'
    }
  })

  // 初始化主题
  const initializeTheme = () => {
    // 从本地存储恢复主题设置
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        currentTheme.value = savedTheme
      }
    }

    // 检测系统主题
    systemTheme.value = detectSystemTheme()

    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        systemTheme.value = e.matches ? 'dark' : 'light'
      }

      // 现代浏览器
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        // 兼容旧浏览器
        mediaQuery.addListener(handleChange)
      }

      // 返回清理函数
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else {
          mediaQuery.removeListener(handleChange)
        }
      }
    }
  }

  // 监听解析后的主题变化
  watch(
    resolvedTheme,
    (newTheme) => {
      applyTheme(newTheme)
    },
    { immediate: true }
  )

  // 组件挂载时初始化
  onMounted(() => {
    const cleanup = initializeTheme()
    
    // 组件卸载时清理
    return cleanup
  })

  return {
    // 状态
    currentTheme: readonly(currentTheme),
    systemTheme: readonly(systemTheme),
    resolvedTheme,
    
    // 计算属性
    themeIcon,
    themeLabel,
    
    // 方法
    setTheme,
    toggleTheme,
    toggleLightDark,
    initializeTheme,
    
    // 主题检查
    isLight: computed(() => resolvedTheme.value === 'light'),
    isDark: computed(() => resolvedTheme.value === 'dark'),
    isAuto: computed(() => currentTheme.value === 'auto')
  }
}

/**
 * 🎨 CSS变量主题工具
 */
export function useThemeVars() {
  // 获取CSS变量值
  const getCSSVar = (varName: string): string => {
    if (typeof document !== 'undefined') {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(`--${varName}`)
        .trim()
    }
    return ''
  }

  // 设置CSS变量值
  const setCSSVar = (varName: string, value: string): void => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(`--${varName}`, value)
    }
  }

  // 主题色彩工具
  const getThemeColor = (colorName: string, shade: number = 500): string => {
    return getCSSVar(`color-${colorName}-${shade}`)
  }

  return {
    getCSSVar,
    setCSSVar,
    getThemeColor
  }
}

/**
 * 🌈 颜色工具函数
 */
export function useColorUtils() {
  // 十六进制转RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  }

  // RGB转十六进制
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  // 获取对比色
  const getContrastColor = (bgColor: string): string => {
    const rgb = hexToRgb(bgColor)
    if (!rgb) return '#000000'

    // 计算亮度
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  // 调整颜色亮度
  const adjustBrightness = (color: string, percent: number): string => {
    const rgb = hexToRgb(color)
    if (!rgb) return color

    const adjust = (channel: number) => {
      const adjusted = Math.round(channel * (100 + percent) / 100)
      return Math.max(0, Math.min(255, adjusted))
    }

    return rgbToHex(
      adjust(rgb.r),
      adjust(rgb.g),
      adjust(rgb.b)
    )
  }

  return {
    hexToRgb,
    rgbToHex,
    getContrastColor,
    adjustBrightness
  }
}