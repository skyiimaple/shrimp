<script setup lang="ts">
import { siteConfig } from '../config'
</script>
<template>
  <section class="panel article-panel">
    <span class="eyebrow">HELLO THERE</span>
    <h1>关于这里</h1>
    <div class="prose">
      <p>你好，我是 {{ siteConfig.author }}。</p>
      <p>{{ siteConfig.bio }}</p>
      <h2>为什么写下来</h2>
      <p>
        把解决问题的过程、值得回看的经验和偶尔冒出的想法，放在一个安静的角落。这是
        {{ siteConfig.title }} 的起点。
      </p>
      <h2>慢慢更新</h2>
      <p>这里会记录开发实践、工具使用与日常思考。先写清楚，再走远一点。</p>
    </div>
  </section>
</template>
