import Vue from 'vue'
import App from './test.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  // data: {
  //   posts: [{title: 'test_title', content: 'test_content'}],
  //   postFontSize: 1
  // },
}).$mount('#app')


