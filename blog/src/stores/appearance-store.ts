import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useColorMode } from '@vueuse/core'
export const useAppearanceStore = defineStore('appearance', () => {
  const mode = useColorMode({ storageKey: 'shrimp-blog:theme' })
  const dark = computed(() => mode.value === 'dark')
  function toggle() {
    mode.value = dark.value ? 'light' : 'dark'
  }
  return { dark, toggle }
})
