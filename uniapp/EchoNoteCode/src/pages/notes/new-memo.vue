<template>
  <view class="memo-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="back-btn" @click="goBack">
          <uni-icons type="back" size="24" color="#1F2937"></uni-icons>
          <text class="back-text">返回</text>
        </view>
      </view>
      <view class="nav-right">
        <text class="save-btn" @click="saveMemo">完成</text>
      </view>
    </view>

    <!-- 编辑区域 -->
    <view class="editor-container" :style="{ backgroundColor: backgroundColor }">
      <input
        class="title-input"
        type="text"
        v-model="title"
        placeholder="输入标题..."
        maxlength="20"
      />
      <textarea
        class="content-input"
        v-model="content"
        placeholder="输入正文..."
        :auto-height="true"
      />
    </view>

    <!-- 底部工具栏 -->
    <view class="toolbar">
      <view class="tool-item" @click="showColorPicker">
        <uni-icons type="palette" size="24" color="#374151"></uni-icons>
      </view>
      <view class="tool-item" @click="toggleFavorite">
        <uni-icons 
          :type="isFavorite ? 'star-filled' : 'star'" 
          size="24" 
          :color="isFavorite ? '#F59E0B' : '#374151'"
        ></uni-icons>
      </view>
      <view class="tool-item" @click="togglePin">
        <uni-icons 
          :type="isPinned ? 'pushpin-filled' : 'pushpin'" 
          size="24" 
          :color="isPinned ? '#3B82F6' : '#374151'"
        ></uni-icons>
      </view>
      <view class="tool-item" @click="startVoiceInput">
        <uni-icons type="mic" size="24" color="#374151"></uni-icons>
      </view>
    </view>

    <!-- 颜色选择器 -->
    <uni-popup ref="colorPopup" type="bottom">
      <view class="color-picker">
        <view class="color-picker-header">
          <text>选择背景色</text>
        </view>
        <view class="color-list">
          <view 
            v-for="color in colorList" 
            :key="color"
            class="color-item"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          ></view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'

// 状态
const title = ref('')
const content = ref('')
const backgroundColor = ref('#F9FAFB')
const isFavorite = ref(false)
const isPinned = ref(false)
const colorPopup = ref()
const memoId = ref<number | null>(null)
const isRecording = ref(false)
let saveTimer: ReturnType<typeof setInterval> | null = null
const originalMemo = ref<any>(null)

// 可选的背景颜色
const colorList = [
  '#F9FAFB',
  '#FFF3E0',
  '#E3F2FD',
  '#E8F5E9',
  '#FCE4EC',
  '#F3E5F5'
]

// 页面加载
onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    memoId.value = Number(options.id)
    loadMemoData(memoId.value)
  }
  
  if (options?.content) {
    content.value = decodeURIComponent(options.content)
  }

  // 启动自动保存
  startAutoSave()
})

// 页面卸载
onUnload(() => {
  if (saveTimer) {
    clearInterval(saveTimer)
  }
})

// 加载备忘录数据
const loadMemoData = (id: number) => {
  try {
    const storageNotes = uni.getStorageSync('notes') || []
    const memo = storageNotes.find((note: any) => note.id === id)
    if (memo) {
      title.value = memo.title
      content.value = memo.content
      backgroundColor.value = memo.backgroundColor || '#F9FAFB'
      isFavorite.value = memo.isFavorite || false
      isPinned.value = memo.isPinned || false
      originalMemo.value = { ...memo }
    }
  } catch (e) {
    console.error('加载备忘录失败:', e)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
}

// 返回上一页
const goBack = () => {
  // 如果有未保存的更改，显示确认对话框
  if (hasUnsavedChanges()) {
    uni.showModal({
      title: '提示',
      content: '有未保存的更改，确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}

// 检查是否有未保存的更改
const hasUnsavedChanges = () => {
  if (memoId.value) {
    // 编辑模式：比较与原始数据是否有变化
    return title.value !== originalMemo.value.title ||
           content.value !== originalMemo.value.content ||
           backgroundColor.value !== originalMemo.value.backgroundColor ||
           isFavorite.value !== originalMemo.value.isFavorite ||
           isPinned.value !== originalMemo.value.isPinned
  } else {
    // 新建模式：检查是否有输入内容
    return title.value !== '' || content.value !== ''
  }
}

// 保存备忘录
const saveMemo = () => {
  if (!title.value && !content.value) {
    uni.showToast({
      title: '标题或内容不能为空',
      icon: 'none'
    })
    return
  }

  const memo = {
    id: memoId.value || Date.now(),
    title: title.value,
    content: content.value,
    backgroundColor: backgroundColor.value,
    isFavorite: isFavorite.value,
    isPinned: isPinned.value,
    updateTime: new Date()
  }

  try {
    // 获取现有笔记
    const storageNotes = uni.getStorageSync('notes') || []
    let notes = JSON.parse(JSON.stringify(storageNotes))
    
    // 如果是编辑现有笔记
    if (memoId.value) {
      const index = notes.findIndex((n: any) => n.id === memoId.value)
      if (index !== -1) {
        notes[index] = memo
      } else {
        notes.push(memo)
      }
    } else {
      // 新建笔记
      notes.push(memo)
    }
    
    // 保存到本地存储
    uni.setStorageSync('notes', notes)
    
    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    })
  } catch (e) {
    uni.showToast({
      title: '保存失败',
      icon: 'error'
    })
  }
}

// 自动保存
const startAutoSave = () => {
  saveTimer = setInterval(() => {
    if (title.value || content.value) {
      // TODO: 保存草稿到本地或后端
      console.log('自动保存草稿')
    }
  }, 5000)
}

// 显示颜色选择器
const showColorPicker = () => {
  colorPopup.value.open()
}

// 选择颜色
const selectColor = (color: string) => {
  backgroundColor.value = color
  colorPopup.value.close()
}

// 切换收藏状态
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
}

// 切换置顶状态
const togglePin = () => {
  isPinned.value = !isPinned.value
}

// 开始语音输入
const startVoiceInput = () => {
  if (isRecording.value) return

  isRecording.value = true
  const recorderManager = uni.getRecorderManager()

  recorderManager.onStop((res) => {
    isRecording.value = false
    if (res.text) {
      content.value += res.text
    }
  })

  recorderManager.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3'
  })

  uni.showToast({
    title: '开始录音',
    icon: 'none'
  })

  // 60秒后自动停止
  setTimeout(() => {
    if (isRecording.value) {
      recorderManager.stop()
    }
  }, 60000)
}
</script>

<style>
.memo-container {
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

.nav-left, .nav-right {
  display: flex;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.back-text {
  font-size: 16px;
  color: #1F2937;
  margin-left: 4px;
}

.save-btn {
  font-size: 16px;
  color: #3B82F6;
  font-weight: 500;
}

.editor-container {
  margin-top: 44px;
  flex: 1;
  padding: 16px;
}

.title-input {
  font-size: 20px;
  font-weight: bold;
  color: #111827;
  margin-bottom: 16px;
  width: 100%;
}

.content-input {
  font-size: 16px;
  color: #374151;
  width: 100%;
  min-height: 200px;
}

.toolbar {
  height: 52px;
  background-color: #fff;
  border-top: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 16px;
}

.tool-item {
  padding: 8px;
}

.color-picker {
  background-color: #fff;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  padding: 16px;
}

.color-picker-header {
  text-align: center;
  margin-bottom: 16px;
}

.color-picker-header text {
  font-size: 16px;
  color: #111827;
  font-weight: 500;
}

.color-list {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
}

.color-item {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: 1px solid #E5E7EB;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .memo-container {
    background-color: #1E1E1E;
  }

  .nav-bar {
    background-color: #1E1E1E;
    border-bottom-color: #374151;
  }

  .title-input {
    color: #F3F4F6;
  }

  .content-input {
    color: #D1D5DB;
  }

  .toolbar {
    background-color: #1E1E1E;
    border-top-color: #374151;
  }

  .color-picker {
    background-color: #1E1E1E;
  }

  .color-picker-header text {
    color: #F3F4F6;
  }

  .color-item {
    border-color: #374151;
  }

  .back-text {
    color: #F3F4F6;
  }
}
</style> 