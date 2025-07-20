/**
 * @fileoverview 路由配置文件
 * @description 定义应用的所有路由规则，使用懒加载优化性能，配置主页面、设置页面、聊天气泡页面
 * @features
 *   - 路由懒加载优化性能
 *   - Hash路由模式适配桌面应用
 *   - 三个主要页面路由配置
 * @routes
 *   - / : 主页面 (MainPage)
 *   - /settings : 设置页面 (SettingsPage) 
 *   - /chat-bubble : 聊天气泡页面 (ChatBubblePage)
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

import { createRouter, createWebHashHistory } from 'vue-router'

// 使用懒加载优化性能
const MainPage = () => import('../pages/MainPage.vue')
const SettingsPage = () => import('../pages/SettingsPage.vue')
const ChatBubblePage = () => import('../pages/ChatBubblePage.vue')

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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
