<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button as UiButton } from '@/components/ui/button'
import { Input as UiInput } from '@/components/ui/input'
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRoute, useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import PostCard from '../components/post-card.vue'
import { posts, filterPosts } from '../utils/posts'
const route = useRoute()
const router = useRouter()
const query = ref('')
const categories = [...new Set(posts.map((post) => post.category))]
const tags = [...new Set(posts.flatMap((post) => post.tags))]
function selectFilter(key: string, value: unknown) {
  if (typeof value !== 'string') return
  void router.push({
    path: '/',
    query: { ...route.query, [key]: value === '全部' ? undefined : value },
  })
}
const category = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : '全部',
)
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : '全部'))
const filtered = computed(() => filterPosts(posts, query.value, category.value, tag.value))
function reset() {
  query.value = ''
  void router.push('/')
}
</script>
<template>
  <section class="feed-heading">
    <div>
      <span class="eyebrow">THE JOURNAL</span>
      <h2>
        最近的记录<span>{{ filtered.length }}</span>
      </h2>
    </div>
    <label class="search-box"
      ><search :size="18" />
      <ui-input v-model="query" aria-label="搜索文章" placeholder="搜索文章…"
    /></label>
  </section>
  <div class="mobile-filters">
    <ui-select :model-value="category" @update:model-value="selectFilter('category', $event)">
      <select-trigger class="filter-trigger" aria-label="文章分类"
        ><select-value placeholder="全部分类"
      /></select-trigger>
      <select-content
        ><select-item value="全部">全部分类</select-item
        ><select-item v-for="item in categories" :key="item" :value="item">{{
          item
        }}</select-item></select-content
      >
    </ui-select>
    <ui-select :model-value="tag" @update:model-value="selectFilter('tag', $event)">
      <select-trigger class="filter-trigger" aria-label="文章标签"
        ><select-value placeholder="全部标签"
      /></select-trigger>
      <select-content
        ><select-item value="全部">全部标签</select-item
        ><select-item v-for="item in tags" :key="item" :value="item">{{
          item
        }}</select-item></select-content
      >
    </ui-select>
  </div>
  <div v-if="category !== '全部' || tag !== '全部' || query" class="filter-summary">
    {{ category !== '全部' ? category : '' }} {{ tag !== '全部' ? `#${tag}` : '' }}
    {{ query ? `搜索：${query}` : ''
    }}<ui-button variant="ghost" @click="reset"><x :size="14" />清除筛选</ui-button>
  </div>
  <div class="post-list"><post-card v-for="post in filtered" :key="post.slug" :post="post" /></div>
  <section v-if="!filtered.length" class="panel empty-state">
    <search :size="28" />
    <h2>还没有找到相关记录</h2>
    <p>试试其他关键词，或清除分类和标签。</p>
    <ui-button class="primary-button" @click="reset">查看全部文章</ui-button>
  </section>
  <p v-else class="feed-end">— 已经读到这里了，下一篇慢慢写 —</p>
</template>
