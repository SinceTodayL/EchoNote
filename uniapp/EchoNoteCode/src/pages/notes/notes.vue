<template>
  <view class="notes-container">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ height: navBarHeight + 'px', paddingRight: (menuButtonInfo.width + 16) + 'px' }">
      <uni-icons type="search" size="22" color="#666" @click="goToSearch" class="search-icon"/>
      <image src="/static/EchoNote.png" mode="aspectFit" class="nav-logo" />
      <view class="nav-placeholder"></view>
    </view>

    <!-- 笔记列表 -->
    <scroll-view 
      scroll-y="true" 
      class="notes-list"
      @refresherrefresh="onRefresh"
      refresher-enabled
      :refresher-triggered="isRefreshing"
    >
      <view v-if="notes.length === 0" class="empty-state">
        <text>还没有任何备忘录，点击 + 记录你的灵感吧。</text>
      </view>
      <view 
        v-else
        v-for="note in sortedNotes" 
        :key="note.id" 
        class="note-item"
        :style="{ backgroundColor: note.backgroundColor || '#FFF5E5' }"
        @click="openNote(note)"
        @contextmenu.prevent="showNoteActions(note)"
        @touchstart="handleTouchStart(note, $event)"
        @touchend="handleTouchEnd"
      >
        <view class="note-content">
          <text class="note-title">{{ note.title }}</text>
          <text class="note-preview">{{ note.content }}</text>
        </view>
        <text class="note-date">{{ formatDate(note.updateTime) }}</text>
      </view>
    </scroll-view>

    <!-- 悬浮按钮 -->
    <button class="fab" @click="createTextMemo">
      <text class="fab-icon">+</text>
    </button>
  </view>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'

interface Note {
  id: number
  title: string
  content: string
  updateTime: Date
  isPinned?: boolean
  backgroundColor?: string
  isFavorite?: boolean
}

// 状态
const notes = ref<Note[]>([])
const isRefreshing = ref(false)
const popup = ref()
const statusBarHeight = ref(0)
const menuButtonInfo = ref<any>({})
const navBarHeight = ref(44)

// 长按计时器和状态
const longPressTimer = ref<number | null>(null)
const touchStartTime = ref(0)
const LONG_PRESS_DURATION = 500 // 长按触发时间（毫秒）

// 计算属性：排序后的笔记列表（置顶优先，然后按时间倒序）
const sortedNotes = computed(() => {
  return [...notes.value].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
  })
})

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 显示操作菜单
const showActionSheet = () => {
  popup.value.open()
}

// 处理操作菜单选择
const handleActionSelect = (e: any) => {
  popup.value.close()
}

// 创建文字备忘录
const createTextMemo = () => {  uni.navigateTo({    url: '/pages/notes/new-memo'  })}

// 打开搜索页面
const goToSearch = () => {
  uni.navigateTo({
    url: '/pages/notes/search'
  })
}

// 打开笔记
const openNote = (note: Note) => {
  uni.navigateTo({
    url: `/pages/notes/new-memo?id=${note.id}`
  })
}

// 处理触摸开始
const handleTouchStart = (note: Note, event: TouchEvent) => {
  touchStartTime.value = Date.now()
  longPressTimer.value = setTimeout(() => {
    showNoteActions(note)
  }, LONG_PRESS_DURATION) as unknown as number
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// 显示笔记操作菜单
const showNoteActions = (note: Note) => {
  // 如果是短按，不显示菜单
  if (Date.now() - touchStartTime.value < LONG_PRESS_DURATION) {
    return
  }
  
  uni.showActionSheet({
    itemList: [note.isPinned ? '取消置顶' : '置顶', '删除'],
    success: (res) => {
      switch (res.tapIndex) {
        case 0:
          togglePin(note)
          break
        case 1:
          handleDelete(note)
          break
      }
    }
  })
}

// 置顶/取消置顶笔记
const togglePin = (note: Note) => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    const index = allNotes.findIndex((n: any) => n.id === note.id)
    if (index > -1) {
      allNotes[index].isPinned = !allNotes[index].isPinned
      uni.setStorageSync('notes', allNotes)
      loadNotes() // 重新加载笔记列表
      uni.showToast({
        title: allNotes[index].isPinned ? '已置顶' : '已取消置顶',
        icon: 'success'
      })
    }
  } catch (e) {
    console.error('操作失败:', e)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 删除笔记
const handleDelete = (note: Note) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条备忘录吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          const allNotes = uni.getStorageSync('notes') || []
          const newNotes = allNotes.filter((n: any) => n.id !== note.id)
          uni.setStorageSync('notes', newNotes)
          loadNotes() // 重新加载笔记列表
          uni.showToast({
            title: '已删除',
            icon: 'success'
          })
        } catch (e) {
          console.error('删除失败:', e)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 加载笔记数据
const loadNotes = () => {
  try {
    const storageNotes = uni.getStorageSync('notes')
    if (storageNotes) {
      notes.value = JSON.parse(JSON.stringify(storageNotes))
    }
  } catch (e) {
    console.error('加载笔记失败:', e)
  }
}

// 下拉刷新
const onRefresh = () => {
  isRefreshing.value = true
  loadNotes()
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

// 页面加载时获取数据
onLoad(() => {
  loadNotes()
  // 获取状态栏高度和胶囊按钮信息
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  // 获取胶囊按钮位置信息
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    menuButtonInfo.value = menuButton
    // 计算导航栏高度：胶囊按钮高度 + 上下间距
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
  } catch (e) {
    console.log('获取胶囊按钮信息失败，使用默认值')
    navBarHeight.value = 44
  }
})

// 每次显示页面时刷新数据
onShow(() => {
  loadNotes()
})
</script>

<style>
.notes-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FFFFFF;
  color: #333333;
  padding: 0 16px 16px 16px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.status-bar {
  background: #FFFFFF;
  width: 100%;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  padding: 0 20px;
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid #F0F0F0;
}

.nav-logo {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) scaleX(1.2); /* 只在X轴方向拉长20% */
  height: 58px; /* 恢复原始高度 */
  max-width: 288px; /* 240px × 1.2 = 288px */
}

.search-icon {
  padding: 8px;
  border-radius: 50%;
  background: #F8F9FA;
  transition: all 0.2s ease;
}

.search-icon:hover {
  background: #E9ECEF;
}

.nav-placeholder {
  width: 22px;
  height: 22px;
}

.notes-list {
  margin-top: 20px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.notes-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.empty-state {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.empty-state text {
  font-size: 16px;
  color: #9CA3AF;
  text-align: center;
}

.note-item {
  background-color: #FFFFFF;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #F0F0F0;
}

.note-content {
  margin-bottom: 8px;
}

.note-title {
  font-size: 16px;
  font-weight: bold;
  color: #111827;
  display: block;
  margin-bottom: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
}

.note-preview {
  font-size: 14px;
  color: #6B7280;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.note-date {
  font-size: 12px;
  color: #9CA3AF;
  text-align: right;
  display: block;
}

.fab {
  position: fixed;
  right: 24px;
  bottom: 120rpx;
  width: 56px;
  height: 56px;
  background-color: #333333;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
}

.fab::after {
  border: none;
}

.fab-icon {
  color: #fff;
  font-size: 200%;
  font-weight: bold;
  line-height: 2;
}
</style> 