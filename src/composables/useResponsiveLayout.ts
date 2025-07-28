import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

// 响应式断点配置
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
}

export function useResponsiveLayout() {
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // 设备类型检测
  const isMobile = computed(() => windowWidth.value < BREAKPOINTS.mobile)
  const isTablet = computed(() => 
    windowWidth.value >= BREAKPOINTS.mobile && windowWidth.value < BREAKPOINTS.desktop
  )
  const isDesktop = computed(() => windowWidth.value >= BREAKPOINTS.desktop)

  // 屏幕方向
  const isPortrait = computed(() => windowHeight.value > windowWidth.value)
  const isLandscape = computed(() => windowWidth.value > windowHeight.value)

  // 设备特性
  const isTouchDevice = computed(() => 'ontouchstart' in window)
  const devicePixelRatio = computed(() => window.devicePixelRatio || 1)

  // 响应式网格列数
  const gridColumns = computed(() => {
    if (isMobile.value) return 1
    if (isTablet.value) return 2
    return 3
  })

  // Element Plus 响应式配置
  const elResponsive = computed(() => ({
    xs: isMobile.value ? 24 : 0,
    sm: isTablet.value ? 12 : 0,
    md: isDesktop.value ? 8 : 0,
    lg: isDesktop.value ? 6 : 0,
    xl: isDesktop.value ? 4 : 0
  }))

  // 容器尺寸计算
  const containerPadding = computed(() => {
    if (isMobile.value) return 12
    if (isTablet.value) return 16
    return 24
  })

  const sidebarWidth = computed(() => {
    if (isMobile.value) return 0
    if (isTablet.value) return 280
    return 320
  })

  // 窗口大小变化处理
  const handleResize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    // 初始化时触发一次
    handleResize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    // 窗口尺寸
    windowWidth: readonly(windowWidth),
    windowHeight: readonly(windowHeight),
    
    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    
    // 屏幕方向
    isPortrait,
    isLandscape,
    
    // 设备特性
    isTouchDevice,
    devicePixelRatio,
    
    // 布局参数
    gridColumns,
    containerPadding,
    sidebarWidth,
    elResponsive,
    
    // 断点值
    breakpoints: BREAKPOINTS
  }
}

// 只读引用工具
function readonly<T>(ref: Ref<T>) {
  return computed(() => ref.value)
}

export type UseResponsiveLayoutReturn = ReturnType<typeof useResponsiveLayout>