<script setup lang="ts">
import { BookOpen, Moon, Sun, ArrowUpRight } from 'lucide-vue-next'
import { Button as ButtonUi } from '@/components/ui/button'
import { siteConfig } from '../config'
import { useAppearanceStore } from '../stores/appearance-store'
const appearance = useAppearanceStore()
</script>
<template>
  <header class="site-header panel">
    <router-link class="brand" to="/"><book-open :size="23" />{{ siteConfig.title }}</router-link>
    <nav aria-label="主导航">
      <router-link to="/" exact-active-class="active">首页</router-link>
      <router-link to="/archives" active-class="active">归档</router-link>
      <router-link to="/about" active-class="active">关于</router-link>
      <a v-if="siteConfig.toolboxUrl" :href="siteConfig.toolboxUrl"
        >工具箱<arrow-up-right :size="14"
      /></a>
    </nav>
    <button-ui
      variant="ghost"
      size="icon"
      class="icon-button"
      :aria-label="appearance.dark ? '切换浅色模式' : '切换深色模式'"
      @click="appearance.toggle"
    >
      <sun v-if="appearance.dark" :size="20" /><moon v-else :size="20" />
    </button-ui>
  </header>
</template>
