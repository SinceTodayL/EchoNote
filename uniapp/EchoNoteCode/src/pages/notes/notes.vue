<template>
  <view class="notes-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">备忘录</text>
      <view class="nav-actions">
        <uni-icons type="search" size="24" color="#1F2937" @click="goToSearch"></uni-icons>
        <uni-icons type="plus" size="24" color="#1F2937" @click="showActionSheet"></uni-icons>
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
        :style="{ backgroundColor: note.backgroundColor || '#F9FAFB' }"
        @click="openNote(note)"
        @longpress="showNoteActions(note)"
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

    <!-- ActionSheet -->
    <uni-popup ref="popup" type="bottom">
      <uni-popup-share 
        title="新建备忘录"
        :beforeClose="true"
        @select="handleActionSelect"
      >
        <uni-popup-share-item
          title="文字备忘录"
          icon="compose"
          @click="createTextMemo"
        />
        <uni-popup-share-item
          title="语音备忘录"
          icon="mic-filled"
          @click="createVoiceMemo"
        />
      </uni-popup-share>
    </uni-popup>
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
const createTextMemo = () => {
  uni.navigateTo({
    url: '/pages/notes/new-memo'
  })
}

// 创建语音备忘录
const createVoiceMemo = () => {
  const recorderManager = uni.getRecorderManager()
  
  recorderManager.onStop((res) => {
    // 语音识别完成后跳转到编辑页面
    uni.navigateTo({
      url: `/pages/notes/new-memo?content=${encodeURIComponent(res.text || '')}`
    })
  })

  // 开始录音
  recorderManager.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3'
  })
}

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

// 显示笔记操作菜单
const showNoteActions = (note: Note) => {
  uni.showActionSheet({
    itemList: ['编辑', '复制', '删除'],
    success: (res) => {
      switch (res.tapIndex) {
        case 0:
          openNote(note)
          break
        case 1:
          uni.setClipboardData({
            data: note.content,
            success: () => {
              uni.showToast({
                title: '已复制到剪贴板',
                icon: 'none'
              })
            }
          })
          break
        case 2:
          deleteNote(note.id)
          break
      }
    }
  })
}

// 删除笔记
const deleteNote = (id: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条备忘录吗？',
    success: (res) => {
      if (res.confirm) {
        notes.value = notes.value.filter(note => note.id !== id)
        // TODO: 同步到后端
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
  background-color: #F9FAFB;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 44px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #E5E7EB;
}

.nav-title {
  font-size: 20px;
  font-weight: bold;
  color: #1F2937;
}

.nav-actions {
  display: flex;
  gap: 16px;
}

.notes-list {
  margin-top: 44px;
  flex: 1;
  padding: 16px;
}

.empty-state {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
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
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .notes-container {
    background-color: #1E1E1E;
  }

  .nav-bar {
    background-color: #1E1E1E;
    border-bottom-color: #374151;
  }

  .nav-title {
    color: #F3F4F6;
  }

  .note-item {
    background-color: #262626;
  }

  .note-title {
    color: #F3F4F6;
  }

  .note-preview {
    color: #9CA3AF;
  }

  .note-date {
    color: #6B7280;
  }
}
</style> 