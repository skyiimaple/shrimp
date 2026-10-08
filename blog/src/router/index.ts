import { createRouter, createWebHistory } from 'vue-router'
import { siteConfig } from '../config'
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../views/home.vue'), meta: { title: '首页' } },
    {
      path: '/archives',
      component: () => import('../views/archives.vue'),
      meta: { title: '归档' },
    },
    { path: '/about', component: () => import('../views/about.vue'), meta: { title: '关于' } },
    { path: '/posts/:slug', component: () => import('../views/post-detail.vue') },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/not-found.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior(to, _from, saved) {
    return saved || (to.hash ? { el: to.hash, top: 90 } : { top: 0 })
  },
})
router.afterEach((to) => {
  document.title = `${String(to.meta.title || '文章')} · ${siteConfig.title}`
})
