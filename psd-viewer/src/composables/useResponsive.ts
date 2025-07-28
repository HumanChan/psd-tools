import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式断点定义
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600
} as const

/**
 * 响应式布局检测 Composable
 * 提供设备类型检测和布局配置
 */
export function useResponsiveLayout() {
  const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
  
  // 设备类型检测
  const isMobile = computed(() => screenWidth.value < breakpoints.md)
  const isTablet = computed(() => 
    screenWidth.value >= breakpoints.md && screenWidth.value < breakpoints.xl
  )
  const isDesktop = computed(() => screenWidth.value >= breakpoints.xl)
  
  // 布局配置
  const sidebarWidth = computed(() => {
    if (isMobile.value) return '100%'
    if (isTablet.value) return '280px'
    return '320px'
  })
  
  const toolbarHeight = computed(() => {
    return isMobile.value ? '50px' : '60px'
  })
  
  const panelWidth = computed(() => {
    return isDesktop.value ? '280px' : '0px'
  })
  
  // 响应式状态
  const sidebarVisible = ref(false)
  const panelVisible = ref(true)
  
  // 窗口大小变化监听
  const handleResize = () => {
    screenWidth.value = window.innerWidth
    
    // 自动调整侧边栏显示状态
    if (isDesktop.value) {
      sidebarVisible.value = true
      panelVisible.value = true
    } else if (isTablet.value) {
      panelVisible.value = false
    } else {
      sidebarVisible.value = false
      panelVisible.value = false
    }
  }
  
  // 组件方法
  const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value
  }
  
  const togglePanel = () => {
    panelVisible.value = !panelVisible.value
  }
  
  // 生命周期
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    handleResize() // 初始化
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
  
  return {
    // 响应式数据
    screenWidth: screenWidth.value,
    
    // 设备类型检测
    isMobile,
    isTablet,
    isDesktop,
    
    // 布局配置
    sidebarWidth,
    toolbarHeight,
    panelWidth,
    
    // 显示状态
    sidebarVisible,
    panelVisible,
    
    // 方法
    toggleSidebar,
    togglePanel,
    
    // 断点常量
    breakpoints
  }
}