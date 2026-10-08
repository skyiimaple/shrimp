<script setup lang="ts">
import { posts } from '../utils/posts'
const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))]
</script>
<template>
  <section class="panel article-panel">
    <span class="eyebrow">THE ARCHIVE</span>
    <h1>文章归档</h1>
    <p class="muted">{{ posts.length }} 篇记录，串起一路的思考。</p>
    <section v-for="year in years" :key="year" class="archive-year">
      <h2>{{ year }}</h2>
      <router-link
        v-for="post in posts.filter((p) => p.date.startsWith(year))"
        :key="post.slug"
        class="archive-link"
        :to="`/posts/${post.slug}`"
        ><time>{{ post.date.slice(5) }}</time
        ><span>{{ post.title }}</span></router-link
      >
    </section>
  </section>
</template>
