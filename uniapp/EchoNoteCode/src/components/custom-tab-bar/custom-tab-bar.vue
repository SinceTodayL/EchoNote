<template>
  <view class="tabbar">
    <view
      v-for="(item, idx) in list"
      :key="idx"
      :class="['tabbar-item', { active: current === idx }]"
      @click="switchTab(item, idx)"
    >
      <image
        :src="current === idx ? item.selectedIconPath : item.iconPath"
        class="tabbar-icon"
      />
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      list: [],       // 从 pages.json 读取
      current: 0
    };
  },
  onLoad() {
    const config = this.$mp.config.globalData.tabBar; // 需在 main.js 中挂载
    this.list = config.list;
    this.current = this.getActiveIndex();
  },
  methods: {
    getActiveIndex() {
      const pages = getCurrentPages();
      const route = pages[pages.length - 1].route;
      return this.list.findIndex(item => item.pagePath === route);
    },
    switchTab(item, idx) {
      this.current = idx;
      uni.switchTab({ url: `/${item.pagePath}` });
      // 可在此触发 Lottie 动画 or 文字提示
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/uni.scss";

.tabbar {
  display: flex;
  background-color: $bg-tabbar;
  padding: 6px 0;
  box-shadow: 0 -1px 4px rgba(0,0,0,0.1);
}
.tabbar-item {
  flex: 1;
  text-align: center;
  .tabbar-icon {
    width: 24px;
    height: 24px;
  }
  .tabbar-text {
    font-size: $font-size-sm;
    color: $text-normal;
    margin-top: 4px;
  }
}
.tabbar-item.active {
  .tabbar-text { 
    color: $primary-color; 
  }
  .tabbar-icon {
    width: 24px;
    height: 24px;
  }
}
</style>
