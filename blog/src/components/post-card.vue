<script setup lang="ts">
import { CalendarDays, Folder, ArrowUpRight } from 'lucide-vue-next'
import type { BlogPost } from '../utils/posts'
defineProps<{ post: BlogPost }>()
</script>
<template>
  <article class="panel post-card">
    <div class="post-accent"></div>
    <div class="post-card-body">
      <div class="post-meta">
        <span><calendar-days :size="14" />{{ post.date }}</span
        ><span><folder :size="14" />{{ post.category }}</span>
      </div>
      <h2>
        <router-link :to="`/posts/${post.slug}`">{{ post.title }}</router-link>
      </h2>
      <p>{{ post.summary }}</p>
      <div class="post-bottom">
        <div class="tag-list">
          <router-link
            v-for="tag in post.tags"
            :key="tag"
            class="tag"
            :to="{ path: '/', query: { tag } }"
            >{{ tag }}</router-link
          >
        </div>
        <span>{{ Math.max(1, Math.ceil(post.body.length / 400)) }} 分钟阅读</span>
      </div>
    </div>
    <router-link class="post-arrow" :to="`/posts/${post.slug}`" :aria-label="`阅读 ${post.title}`"
      ><arrow-up-right :size="23"
    /></router-link>
  </article>
</template>
