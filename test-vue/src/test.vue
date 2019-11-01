<template>
  <div id="blog-post-demo">
    <div :style="{ fontSize: postFontSize + 'em' }">
      <blog-post v-for="post in posts" v-bind:key="post.id" v-bind:post="post"></blog-post>
    </div>
  </div>
</template>


<script>
import Vue from 'vue'
export default {

}
new Vue({
  el: '#blog-post-demo',
  data: {
    posts: [
      { id: 1, title: 'My journey with Vue', content: 'a' },
      { id: 2, title: 'Blogging with Vue', content: 'b' },
      { id: 3, title: 'Why Vue is so fun', content: 'c' }
    ],
    postFontSize: 1,
  },
  
})
Vue.component("blog-post", {
  props: ["post"],
  template: `
    <div class="blog-post">
      <h3>{{ post.title }}</h3>
      <button>
        Enlarge text
      </button>
      <div v-html="post.content"></div>
    </div>
  `
});
</script>
