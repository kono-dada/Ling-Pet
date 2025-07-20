import { createPlugin } from "@tauri-store/pinia";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";


// 创建Vue应用实例，注册路由器并挂载到DOM元素
const app = createApp(App);
app.use(router);
const pinia = createPinia();
pinia.use(createPlugin());
app.use(pinia);
app.use(vuetify);
app.mount("#app");
