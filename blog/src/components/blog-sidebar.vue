<script setup lang="ts">
import { ArrowRight, Folder, Hash, Leaf } from 'lucide-vue-next'
import { siteConfig } from '../config'
import { posts } from '../utils/posts'
const categories = [...new Set(posts.map((p) => p.category))]
const tags = [...new Set(posts.flatMap((p) => p.tags))]
</script>
<template>
  <aside class="sidebar">
    <section class="panel profile">
      <img class="avatar" :src="siteConfig.avatar" :alt="`${siteConfig.author} 的头像`" />
      <h2>{{ siteConfig.author }}</h2>
      <p>{{ siteConfig.bio }}</p>
      <span class="profile-label"><leaf :size="14" /> 保持好奇，慢慢生长</span>
      <div class="profile-stats">
        <div>
          <strong>{{ posts.length }}</strong
          ><span>文章</span>
        </div>
        <div>
          <strong>{{ categories.length }}</strong
          ><span>分类</span>
        </div>
        <div>
          <strong>{{ tags.length }}</strong
          ><span>标签</span>
        </div>
      </div>
    </section>
    <section class="panel sidebar-section">
      <h2><folder :size="17" />分类</h2>
      <router-link
        v-for="category in categories"
        :key="category"
        class="category-link"
        :to="{ path: '/', query: { category } }"
        >{{ category
        }}<span
          >{{ posts.filter((p) => p.category === category).length }}<arrow-right :size="14" /></span
      ></router-link>
    </section>
    <section class="panel sidebar-section">
      <h2><hash :size="17" />标签</h2>
      <div class="tag-list">
        <router-link
          v-for="tag in tags"
          :key="tag"
          class="tag"
          :to="{ path: '/', query: { tag } }"
          >{{ tag }}</router-link
        >
      </div>
    </section>
    <p class="sidebar-note">一点思考，一点记录。<br />让每次探索都有迹可循。</p>
  </aside>
</template>
