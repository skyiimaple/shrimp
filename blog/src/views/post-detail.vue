<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { posts, renderPost } from '../utils/posts'
import { siteConfig } from '../config'
import NotFound from './not-found.vue'
const route = useRoute()
const post = computed(() => posts.find((p) => p.slug === route.params.slug))
const rendered = computed(() => (post.value ? renderPost(post.value.body) : null))
watchEffect(() => {
  document.title = `${post.value?.title || '文章不存在'} · ${siteConfig.title}`
})
</script>
<template>
  <article v-if="post && rendered" class="panel article-panel">
    <router-link class="back-link" to="/"><arrow-left :size="16" />返回文章列表</router-link>
    <header class="article-header">
      <span class="eyebrow">{{ post.category }}</span>
      <h1>{{ post.title }}</h1>
      <p>{{ post.date }} · {{ Math.max(1, Math.ceil(post.body.length / 400)) }} 分钟阅读</p>
      <div class="tag-list">
        <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </header>
    <nav v-if="rendered.headings.length" class="toc" aria-label="文章目录">
      <h2>文章目录</h2>
      <a
        v-for="heading in rendered.headings"
        :key="heading.id"
        :href="`#${heading.id}`"
        :style="{ paddingLeft: `${Math.max(0, heading.level - 2) * 12}px` }"
        >{{ heading.text }}</a
      >
    </nav>
    <!-- Only sanitized Markdown HTML produced by renderPost is inserted here. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose" v-html="rendered.html"></div>
  </article>
  <not-found v-else />
</template>
