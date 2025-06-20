<!--
  File: search.vue
  Description: Note search page with keyword filtering and highlight display.
  Author: Zhen Liu
  Created: 2025-05-22
  Last Modified: 2025-06-14
-->
<template>
  <view class="search-container">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    <!-- 搜索栏 -->
    <view class="search-bar" :style="{ height: navBarHeight + 'px', paddingRight: (menuButtonInfo.width + 16) + 'px' }">
      <view class="search-input-wrapper">
        <uni-icons type="search" size="20" color="#666"></uni-icons>
        <input 
          type="text" 
          v-model="searchText"
          placeholder="搜索备忘录" 
          class="search-input"
          focus
          @input="onSearch"
        />
        <uni-icons 
          v-if="searchText"
          type="clear" 
          size="20" 
          color="#666"
          @click="clearSearch"
        ></uni-icons>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>

    <!-- 搜索结果 -->
    <scroll-view 
      scroll-y="true" 
      class="search-results"
      :style="{ height: 'calc(100vh - ' + (statusBarHeight + navBarHeight) + 'px)' }"
    >
      <view v-if="searchText && !filteredNotes.length" class="empty-state">
        <text>未找到相关备忘录</text>
      </view>
      <view 
        v-else
        v-for="note in filteredNotes" 
        :key="note.id" 
        class="note-item"
        :style="{ backgroundColor: note.backgroundColor || '#F9FAFB' }"
        @click="openNote(note)"
      >
        <view class="note-content">
          <text class="note-title" v-html="highlightText(note.title)"></text>
          <text class="note-preview" v-html="highlightText(note.content)"></text>
        </view>
        <text class="note-date">{{ formatDate(note.updateTime) }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 临时的获取所有笔记函数
const getAllNotes = async () => {
  try {
    return uni.getStorageSync('notes') || []
  } catch (e) {
    console.error('获取笔记失败:', e)
    return []
  }
}

interface Note {
  id: number
  title: string
  content: string
  updateTime: number
  createTime: number
  isPinned: boolean
  backgroundColor: string
  isFavorite: boolean
}

// 状态
const searchText = ref('')
const notes = ref<Note[]>([])
const statusBarHeight = ref(0)
const menuButtonInfo = ref<any>({})
const navBarHeight = ref(44)

// 过滤后的笔记列表
const filteredNotes = computed(() => {
  if (!searchText.value) return []
  const searchLower = searchText.value.toLowerCase()
  return notes.value.filter(note => 
    note.title.toLowerCase().includes(searchLower) ||
    note.content.toLowerCase().includes(searchLower)
  )
})

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 高亮搜索文本
const highlightText = (text: string) => {
  if (!searchText.value) return text
  const regex = new RegExp(`(${searchText.value})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

// 加载笔记数据
const loadNotes = async () => {
  try {
    const allNotes = await getAllNotes()
    notes.value = allNotes
  } catch (e) {
    console.error('加载笔记失败:', e)
    uni.showToast({
      title: '加载笔记失败',
      icon: 'none'
    })
  }
}

const onSearch = () => {
}

// 清除搜索
const clearSearch = () => {
  searchText.value = ''
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 打开笔记
const openNote = (note: Note) => {
  uni.navigateTo({
    url: `/pages/notes/new-memo?id=${note.id}`
  })
}

// 页面加载时获取数据
onLoad(async () => {
  await loadNotes()
  // 获取状态栏高度和胶囊按钮信息
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  // 获取胶囊按钮位置信息
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    menuButtonInfo.value = menuButton
    // 计算导航栏高度
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
  } catch (e) {
    console.log('获取胶囊按钮信息失败，使用默认值')
    navBarHeight.value = 44
  }
})
</script>

<style>
.search-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #FFFFFF;
  position: relative;
}

.status-bar {
  background-color: #FFFFFF;
  width: 100%;
}

.search-bar {
  padding: 0 16px;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #F0F0F0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #F8F9FA;
  padding: 8px 12px;
  border-radius: 8px;
  gap: 8px;
}

.search-input {
  flex: 1;
  font-size: 16px;
  color: #333333;
}

.cancel-btn {
  font-size: 16px;
  color: #333333;
}

.search-results {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #9CA3AF;
  font-size: 16px;
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

.highlight {
  background-color: #FEF3C7;
  color: #92400E;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .search-container {
    background-color: #1E1E1E;
  }

  .search-bar {
    background-color: #1E1E1E;
    border-bottom-color: #374151;
  }

  .search-input-wrapper {
    background-color: #374151;
  }

  .search-input {
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

  .highlight {
    background-color: #92400E;
    color: #FEF3C7;
  }
}
</style> 