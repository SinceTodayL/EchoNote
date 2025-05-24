<template>
  <view class="search-container">
    <!-- 搜索栏 -->
    <view class="search-bar">
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
    <scroll-view scroll-y="true" class="search-results">
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

interface Note {
  id: number
  title: string
  content: string
  updateTime: Date
  backgroundColor?: string
}

// 状态
const searchText = ref('')
const notes = ref<Note[]>([])

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
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
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
const loadNotes = () => {
  try {
    const storageNotes = uni.getStorageSync('notes')
    if (storageNotes) {
      notes.value = JSON.parse(JSON.stringify(storageNotes))
    }
  } catch (e) {
    console.error('加载笔记失败:', e)
    uni.showToast({
      title: '加载笔记失败',
      icon: 'none'
    })
  }
}

// 搜索处理
const onSearch = () => {
  // 实时搜索，不需要额外处理
  // 因为 filteredNotes 是计算属性，会自动更新
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
onLoad(() => {
  loadNotes()
})
</script>

<style>
.search-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #F9FAFB;
}

.search-bar {
  padding: 8px 16px;
  background-color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #E5E7EB;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #F3F4F6;
  padding: 8px 12px;
  border-radius: 8px;
  gap: 8px;
}

.search-input {
  flex: 1;
  font-size: 16px;
  color: #111827;
}

.cancel-btn {
  font-size: 16px;
  color: #3B82F6;
}

.search-results {
  flex: 1;
  padding: 16px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #9CA3AF;
  font-size: 16px;
}

.note-item {
  background-color: #fff;
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