<template>
  <App/>
  <custom-tab-bar />
</template>


<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
  components: { customTabBar }
}
import customTabBar from '@/components/custom-tab-bar/custom-tab-bar.vue'
</script>

<style>
/*每个页面公共css */
</style>
