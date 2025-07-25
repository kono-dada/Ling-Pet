import { createRouter, createWebHashHistory } from 'vue-router'

// 使用懒加载优化性能
const MainPage = () => import('../pages/MainPage.vue')
const SettingsPage = () => import('../pages/SettingsPage.vue')
const ChatBubblePage = () => import('../pages/ChatBubblePage.vue')
const ChatHistoryPage = () => import('../pages/ChatHistoryPage.vue')

const routes = [
  {
    path: '/',
    name: 'main',
    component: MainPage
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage
  },
  {
    path: '/chat-bubble',
    name: 'chat-bubble',
    component: ChatBubblePage
  },
  {
    path: '/chat-history',
    name: 'chat-history',
    component: ChatHistoryPage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
