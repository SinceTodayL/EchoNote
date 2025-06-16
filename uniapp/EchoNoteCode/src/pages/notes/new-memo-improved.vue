<!--
  File: new-memo-improved.vue
  Description: Simplified note editing page for creating, editing, and saving notes.
  Author: Zhen Liu
  Created: 2025-05-22
  Last Modified: 2025-06-14
-->
<template>
  <view class="memo-container">
    <!-- 简洁导航栏 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <uni-icons type="left" size="24" color="#333"></uni-icons>
      </view>
      <text class="nav-title">编辑笔记</text>
      <view class="save-btn" @click="saveNote">
        <text>保存</text>
      </view>
    </view>

    <!-- 编辑区域 -->
    <view class="edit-area">
      <input
        class="title-input"
        v-model="title"
        placeholder="标题"
        :maxlength="100"
        @input="onTitleInput"
      />
      <textarea
        class="content-input"
        v-model="content"
        placeholder="开始输入..."
        :maxlength="5000"
        @input="onContentInput"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { saveNote as saveNoteToFile, loadNote as loadNoteFromFile } from '@/utils/fileStorage'

// 基础状态
const title = ref('')
const content = ref('')
const noteId = ref<number | null>(null)
const hasChanges = ref(false)

// 生命周期
onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    noteId.value = parseInt(options.id)
    loadNoteData()
  }
  if (options?.content) {
    content.value = decodeURIComponent(options.content)
  }
})

// 数据操作函数
const loadNoteData = async () => {
  if (!noteId.value) return
  
  try {
    const note = await loadNoteFromFile(noteId.value)
    if (note) {
      title.value = note.title
      content.value = note.content
    }
  } catch (e) {
    console.error('加载笔记失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const saveNote = async () => {
  if (!title.value && !content.value) {
    goBack()
    return
  }

  try {
    const now = Date.now()
    const noteData = {
      id: noteId.value || now,
      title: title.value,
      content: content.value,
      createTime: noteId.value ? (await loadNoteFromFile(noteId.value))?.createTime || now : now,
      updateTime: now
    }
    
    const success = await saveNoteToFile(noteData)
    if (success) {
      hasChanges.value = false
      uni.showToast({ title: '已保存', icon: 'success' })
      goBack()
    }
  } catch (e) {
    console.error('保存失败:', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// UI交互函数
const onTitleInput = () => { 
  hasChanges.value = true
}
const onContentInput = () => { 
  hasChanges.value = true 
}

const goBack = () => {
  if (hasChanges.value) {
    uni.showModal({
      title: '提示',
      content: '是否保存当前编辑的内容？',
      success: (res) => {
        if (res.confirm) {
          saveNote()
        } else {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}
</script>

<style>
.memo-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #FFFFFF;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.back-btn {
  padding: 8px;
  border-radius: 50%;
  background: #F8F9FA;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #333333;
}

.save-btn {
  padding: 8px 16px;
  background: #3B82F6;
  color: white;
  border-radius: 8px;
  font-size: 14px;
}

.edit-area {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-input {
  font-size: 20px;
  font-weight: bold;
  color: #333333;
  border: none;
  outline: none;
  padding: 12px 0;
  border-bottom: 1px solid #E5E7EB;
}

.content-input {
  flex: 1;
  font-size: 16px;
  line-height: 1.6;
  color: #333333;
  border: none;
  outline: none;
  resize: none;
}
</style> 