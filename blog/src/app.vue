<script setup lang="ts">
import SiteHeader from './components/site-header.vue'
import BlogSidebar from './components/blog-sidebar.vue'
import { siteConfig } from './config'
</script>
<template>
  <div :style="{ '--accent-hue': siteConfig.accentHue }">
    <div class="hero">
      <img :src="siteConfig.banner" alt="蔚蓝天空下的层叠山峦" />
      <div class="hero-caption">
        <span>NOTES & LITTLE DISCOVERIES</span>
        <h1>{{ siteConfig.subtitle }}</h1>
        <p>记录技术，也记录生活里的片刻。</p>
      </div>
    </div>
    <div class="site-container">
      <site-header />
      <div class="page-grid">
        <blog-sidebar />
        <main id="main-content"><router-view /></main>
      </div>
      <footer>
        © {{ new Date().getFullYear() }} {{ siteConfig.author }} · 用文字收藏每一次探索<br /><span
          >{{ siteConfig.title }}</span
        >
      </footer>
    </div>
  </div>
</template>
