import { createPlugin } from "@tauri-store/pinia";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Material Design Icons 样式

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    // 确保默认图标集设置为 'mdi'
    defaultSet: 'mdi',
  },
})


// 创建Vue应用实例，注册路由器并挂载到DOM元素
const app = createApp(App);
app.use(router);
const pinia = createPinia();
pinia.use(createPlugin());
app.use(pinia);
app.use(vuetify);
app.mount("#app");
