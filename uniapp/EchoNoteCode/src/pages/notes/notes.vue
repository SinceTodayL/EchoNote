<template>
  <view class="notes-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">EchoNote</text>
      <view class="search-bar">
        <image 
          src="/static/search.png" 
          mode="aspectFit" 
          class="search-icon"
          @click="goToSearch"
        />
      </view>
      <view class="nav-actions">
        <uni-icons type="plus" size="24" @click="showActionSheet" />
      </view>
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

// 创建文字备忘录const createTextMemo = () => {  uni.navigateTo({    url: '/pages/notes/new-memo'  })}

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
  background: linear-gradient(135deg, #fdf2e9 0%, #fae6c8 100%);
  color: #5c5246;
  padding: 16px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(8px); 
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  margin-bottom: 0%;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-title {
  font-size: 24px;
  font-weight: 1000;
  letter-spacing: 1px;
  color: #b37a41;
  text-shadow: 1px 1px 1px rgba(49, 46, 5, 0.2);
}

.search-bar {
  flex: 1;
  margin: 0 16px;
  max-width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.search-icon {
  width: 50px;
  height: 50px;
  cursor: pointer;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-actions uni-icons {
  font-size: 24px;
  color: #b37a41;
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
  background-color: #F9FAFB;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  background-color: #3B82F6;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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