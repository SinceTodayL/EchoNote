<!--
  File: todo.vue
  Description: Todo list page for displaying, adding, completing, and deleting tasks.
  Author: Zhen Liu
  Created: 2025-05-22
  Last Modified: 2025-06-14
-->
<template>
  <view class="profile-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <text class="navbar-title">个人中心</text>
    </view>
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <image class="avatar" src="/static/profile.jpg" mode="aspectFill" />
      <view class="user-info">
        <text class="username">SinceToday</text>
        <text class="user-id">ID: 2352471</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="feature-list">
      <view class="feature-group">
        <view class="feature-item" @click="handleFeatureClick('statistics')">
          <view class="feature-left">
            <uni-icons type="chart" size="24" color="#3cc51f"></uni-icons>
            <text>数据统计</text>
          </view>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>

        <view class="feature-item" @click="handleFeatureClick('backup')">
          <view class="feature-left">
            <uni-icons type="cloud-upload" size="24" color="#3cc51f"></uni-icons>
            <text>数据备份</text>
          </view>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>

        <view class="feature-item" @click="handleFeatureClick('theme')">
          <view class="feature-left">
            <uni-icons type="color" size="24" color="#3cc51f"></uni-icons>
            <text>主题设置</text>
          </view>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>
      </view>

      <view class="feature-group">
        <view class="feature-item" @click="handleFeatureClick('about')">
          <view class="feature-left">
            <uni-icons type="info" size="24" color="#3cc51f"></uni-icons>
            <text>关于我们</text>
          </view>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>

        <view class="feature-item" @click="handleFeatureClick('feedback')">
          <view class="feature-left">
            <uni-icons type="chat" size="24" color="#3cc51f"></uni-icons>
            <text>意见反馈</text>
          </view>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-info">
      <text>当前版本 1.0.2</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const handleFeatureClick = (feature: string) => {
  // TODO: 实现各功能的跳转逻辑
  // 本项目暂时不做后端，因此暂不考虑实现这一部分
  console.log('Clicked feature:', feature)
}
</script>

<style>
.profile-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 40rpx;
}

/* 自定义导航栏 */
.custom-navbar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 88rpx;
  background-color: #ffffff;
  padding-top: 64rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.user-card {
  background-color: #ffffff;
  padding: 40rpx;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 30rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.user-id {
  font-size: 24rpx;
  color: #999;
}

.feature-list {
  padding: 0 20rpx;
}

.feature-group {
  background-color: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.feature-left text {
  font-size: 28rpx;
  color: #333;
}

.version-info {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 24rpx;
}
</style> 