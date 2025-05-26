<template>
  <view class="memo-container" :style="{ backgroundColor: backgroundColor }">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="back-btn" @click="goBack">
          <uni-icons type="back" size="24" color="#374151"></uni-icons>
          <text class="back-text">返回</text>
        </view>
      </view>
      <view class="nav-right">
        <text class="save-btn" @click="saveNoteData">完成</text>
      </view>
    </view>

    <!-- 主要编辑区域 -->
    <view class="main-container">
      <!-- 编辑区域 -->
      <view class="edit-area" :class="[currentTheme, { 'preview-mode': isPreview }]">
        <input
          class="title-input"
          type="text"
          v-model="title"
          placeholder="标题"
          :maxlength="50"
          @input="onTitleInput"
        />
        <view class="content-wrapper">
          <textarea
            v-show="!isPreview"
            class="content-input"
            v-model="content"
            placeholder="开始输入..."
            :maxlength="5000"
            @input="onContentInput"
          />
          <view 
            v-show="isPreview"
            class="markdown-preview markdown-body"
            v-html="renderedContent"
          ></view>
        </view>
      </view>
      
      <!-- 右侧样式控制面板 -->
      <view class="style-panel" v-show="showStylePanel">
        <view class="panel-header">
          <text class="panel-title">样式设置</text>
          <uni-icons 
            type="close" 
            size="20" 
            color="#666" 
            @click="closeStylePanel"
          ></uni-icons>
        </view>
        
        <!-- 主题选择区域 -->
        <view class="style-section">
          <text class="section-title">编辑器主题</text>
          <view class="theme-options">
            <view 
              v-for="theme in themes" 
              :key="theme.value"
              class="theme-option"
              :class="{ active: currentTheme === theme.value }"
              @click="selectTheme(theme.value)"
            >
              <text class="theme-label">{{ theme.name }}</text>
            </view>
          </view>
        </view>
        
        <!-- 背景颜色选择区域 -->
        <view class="style-section">
          <text class="section-title">背景颜色</text>
          <view class="color-options">
            <view 
              v-for="color in colorList" 
              :key="color.value"
              class="color-option"
              :class="{ active: backgroundColor === color.value }"
              :style="{ backgroundColor: color.value }"
              @click="selectBackgroundColor(color.value)"
            >
              <uni-icons 
                v-if="backgroundColor === color.value"
                type="checkmarkempty" 
                size="14" 
                color="#333"
              ></uni-icons>
              <text class="color-label">{{ color.name }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 工具栏 -->
    <view class="toolbar">
      <view class="tool-left">
        <view class="tool-group">
          <uni-icons 
            type="settings" 
            size="24" 
            :color="showStylePanel ? '#3B82F6' : '#374151'"
            @click="toggleStylePanel"
          ></uni-icons>
          <uni-icons 
            :type="isPreview ? 'eye-slash' : 'eye'" 
            size="24" 
            :color="isPreview ? '#3B82F6' : '#374151'"
            @click="togglePreview"
          ></uni-icons>
          <uni-icons 
            :type="isFavorite ? 'star-filled' : 'star'" 
            size="24" 
            :color="isFavorite ? '#F59E0B' : '#374151'"
            @click="toggleFavorite"
          ></uni-icons>
          <uni-icons 
            :type="isPinned ? 'pushpin-filled' : 'pushpin'" 
            size="24" 
            :color="isPinned ? '#3B82F6' : '#374151'"
            @click="togglePin"
          ></uni-icons>
        </view>
      </view>
      
      <!-- 语音输入按钮 -->
      <view class="voice-input-container">
        <view 
          class="voice-btn"
          :class="{ 'voice-btn-active': isListening }"
          @click="toggleVoiceInput"
        >
          <uni-icons 
            type="mic" 
            size="20" 
            :color="isListening ? '#FFFFFF' : '#374151'"
          ></uni-icons>
          <text class="voice-btn-text" :style="{ color: isListening ? '#FFFFFF' : '#374151' }">
            {{ isListening ? '正在倾听...' : '点击开始语音输入' }}
          </text>
        </view>
      </view>
      
      <view class="word-count">{{ content.length }}/5000</view>
    </view>

    <!-- 语音输入弹窗 -->
    <view 
      class="voice-modal" 
      v-show="isListening"
      @click="stopVoiceInput"
    >
      <view class="voice-modal-content" @click.stop>
        <view class="voice-animation">
          <view class="voice-wave"></view>
          <view class="voice-wave"></view>
          <view class="voice-wave"></view>
        </view>
        <text class="voice-text">倾听中...</text>
        <text class="voice-tip">点击空白处停止录音</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import { marked } from 'marked'
import { saveNote as saveNoteToFile, loadNote as loadNoteFromFile } from '@/utils/fileStorage'

// 基础状态
const title = ref('')
const content = ref('')
const noteId = ref<number | null>(null)
const hasChanges = ref(false)
const lastSaveTime = ref(Date.now())
const autoSaveInterval = ref<number | null>(null)

// 样式和UI状态
const backgroundColor = ref('#FFFFFF')
const isFavorite = ref(false)
const isPinned = ref(false)
const isPreview = ref(false)
const showStylePanel = ref(false)
const currentTheme = ref('newsprint')

// 语音输入状态
const isListening = ref(false)

// Markdown渲染
const renderedContent = computed(() => {
  if (!content.value) return ''
  try {
    return marked(content.value)
  } catch (e) {
    console.error('Markdown 渲染失败:', e)
    return content.value
  }
})

// 颜色选项
const colorList = [
  { name: '默认', value: '#FFFFFF' },
  { name: '暖黄', value: '#FFF7E6' },
  { name: '粉红', value: '#FFF1F0' },
  { name: '薄荷', value: '#F6FFED' },
  { name: '天蓝', value: '#E6F7FF' },
  { name: '紫色', value: '#F9F0FF' }
]

// 主题选项
const themes = [
  { name: '默认', value: 'newsprint' },
  { name: 'Github', value: 'github' },
  { name: 'Whitey', value: 'whitey' },
  { name: 'Pixyll', value: 'pixyll' }
]

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

onMounted(() => {
  autoSaveInterval.value = setInterval(autoSave, 30000) as unknown as number
  loadThemeStyle(currentTheme.value)
})

onBeforeUnmount(() => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
})

onBackPress(() => {
  if (hasChanges.value) {
    saveNoteData()
  }
  return false
})

// 数据操作函数
const loadNoteData = async () => {
  if (!noteId.value) return
  
  try {
    const note = await loadNoteFromFile(noteId.value)
    if (note) {
      title.value = note.title
      content.value = note.content
      backgroundColor.value = note.backgroundColor || '#FFFFFF'
      isFavorite.value = note.isFavorite || false
      isPinned.value = note.isPinned || false
    }
  } catch (e) {
    console.error('加载笔记失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const saveNoteData = async () => {
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
      backgroundColor: backgroundColor.value,
      isFavorite: isFavorite.value,
      isPinned: isPinned.value,
      createTime: noteId.value ? (await loadNoteFromFile(noteId.value))?.createTime || now : now,
      updateTime: now
    }
    
    const success = await saveNoteToFile(noteData)
    if (success) {
      if (!noteId.value) noteId.value = now
      lastSaveTime.value = now
      hasChanges.value = false
      uni.showToast({ title: '已保存', icon: 'success' })
    }
  } catch (e) {
    console.error('保存失败:', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const autoSave = () => {
  if (hasChanges.value && Date.now() - lastSaveTime.value >= 30000) {
    saveNoteData()
  }
}

// UI交互函数
const onTitleInput = () => { hasChanges.value = true }
const onContentInput = () => { hasChanges.value = true }

const toggleStylePanel = () => { showStylePanel.value = !showStylePanel.value }
const closeStylePanel = () => { showStylePanel.value = false }
const togglePreview = () => { isPreview.value = !isPreview.value }
const toggleFavorite = () => { isFavorite.value = !isFavorite.value; hasChanges.value = true }
const togglePin = () => { isPinned.value = !isPinned.value; hasChanges.value = true }

// 语音输入函数
const toggleVoiceInput = () => {
  if (isListening.value) {
    stopVoiceInput()
  } else {
    startVoiceInput()
  }
}

const startVoiceInput = () => {
  isListening.value = true
  // 这里可以添加实际的语音识别逻辑
  uni.showToast({ title: '开始语音输入', icon: 'none' })
}

const stopVoiceInput = () => {
  isListening.value = false
  // 这里可以添加停止语音识别的逻辑
  uni.showToast({ title: '语音输入结束', icon: 'none' })
}

const goBack = () => {
  if (hasChanges.value) {
    uni.showModal({
      title: '提示',
      content: '是否保存更改？',
      cancelText: '不保存',
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) saveNoteData()
        uni.navigateBack()
      }
    })
  } else {
    uni.navigateBack()
  }
}

// 主题和样式函数
const selectTheme = (themeName: string) => {
  currentTheme.value = themeName
  loadThemeStyle(themeName)
  hasChanges.value = true
}

const selectBackgroundColor = (color: string) => {
  backgroundColor.value = color
  hasChanges.value = true
}

const loadThemeStyle = (themeName: string) => {
  try {
    // 移除旧主题
    const oldTheme = document.querySelector('link[data-theme]')
    if (oldTheme) oldTheme.remove()
    
    // 添加新主题
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/src/static/css/${themeName}.css`
    link.setAttribute('data-theme', 'true')
    document.head.appendChild(link)
  } catch (e) {
    console.error('加载主题失败:', e)
  }
}

// 监听变化
watch(content, () => { hasChanges.value = true })
watch(currentTheme, (newTheme) => { loadThemeStyle(newTheme) })
</script>

<style lang="scss">
.memo-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: background-color 0.3s ease;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #E5E7EB;
  z-index: 10;
}

.back-btn {
  display: flex;
  align-items: center;
  
  .back-text {
    margin-left: 4px;
    font-size: 16px;
    color: #374151;
  }
}

.save-btn {
  font-size: 16px;
  color: #3B82F6;
  font-weight: 500;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.edit-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  
  &.preview-mode {
    .markdown-preview {
      padding: 20px;
      line-height: 1.6;
    }
  }
}

.title-input {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
}

.content-wrapper {
  height: calc(100% - 60px);
}

.content-input,
.markdown-preview {
  width: 100%;
  height: 100%;
  font-size: 16px;
  line-height: 1.6;
  background: transparent;
  color: inherit;
}

.content-input {
  border: none;
  outline: none;
  resize: none;
}

.style-panel {
  width: 300px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid #E5E7EB;
  padding: 20px;
  overflow-y: auto;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E5E7EB;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.style-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #4B5563;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-option {
  padding: 12px 16px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #FFFFFF;
  
  &:hover {
    background-color: #F3F4F6;
    border-color: #D1D5DB;
  }
  
  &.active {
    background-color: #3B82F6;
    border-color: #3B82F6;
    
    .theme-label {
      color: #FFFFFF;
    }
  }
}

.theme-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.color-option {
  padding: 16px 12px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 80px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.active {
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
}

.color-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  text-align: center;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid #E5E7EB;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.voice-input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  margin: 0 20px;
}

.voice-btn {
  padding: 12px 20px;
  border: 2px solid #E5E7EB;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  
  &:hover {
    background-color: #F3F4F6;
    border-color: #D1D5DB;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &.voice-btn-active {
    background-color: #3B82F6;
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    
    .voice-btn-icon {
      color: #FFFFFF;
    }
  }
}

.voice-btn-icon {
  font-size: 16px;
  color: #374151;
}

.voice-btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.word-count {
  font-size: 12px;
  color: #9CA3AF;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

/* 语音输入样式 */
.voice-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.voice-modal-content {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 200px;
}

.voice-animation {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
}

.voice-wave {
  width: 4px;
  background-color: #3B82F6;
  border-radius: 2px;
  animation: voice-wave 1.2s ease-in-out infinite;
}

.voice-wave:nth-child(1) {
  height: 20px;
  animation-delay: 0s;
}

.voice-wave:nth-child(2) {
  height: 30px;
  animation-delay: 0.2s;
}

.voice-wave:nth-child(3) {
  height: 25px;
  animation-delay: 0.4s;
}

@keyframes voice-wave {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.5);
  }
}

.voice-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.voice-tip {
  font-size: 14px;
  color: #9CA3AF;
  text-align: center;
}

/* Markdown样式 */
.markdown-body {
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }

  h1 {
    font-size: 2em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  h2 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  p {
    margin-bottom: 16px;
  }

  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0 0 16px 0;
  }

  code {
    padding: 0.2em 0.4em;
    font-size: 85%;
    background-color: rgba(27,31,35,0.05);
    border-radius: 3px;
  }

  pre {
    padding: 16px;
    overflow: auto;
    background-color: #f6f8fa;
    border-radius: 6px;
  }

  ul, ol {
    padding-left: 2em;
    margin-bottom: 16px;
  }
}

/* 响应式 */
@media screen and (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
  
  .style-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid #E5E7EB;
    max-height: 50vh;
  }
  
  .color-options {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style> 