<script setup lang="ts">
import { Button as UiButton } from '@/components/ui/button'
</script>
<template>
  <section class="panel empty-state">
    <span class="eyebrow">404</span>
    <h1>这篇记录还没写下</h1>
    <p>页面可能已移动，回首页看看其他文章吧。</p>
    <ui-button as-child class="primary-button"
      ><router-link to="/">返回首页</router-link></ui-button
    >
  </section>
</template>
