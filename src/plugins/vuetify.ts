import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Material Design Icons 样式


export default createVuetify({
  components,
  directives,
  icons: {
    // 确保默认图标集设置为 'mdi'
    defaultSet: 'mdi',
  },
})