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
        <text class="save-btn" @click="saveNote">完成</text>
      </view>
    </view>

    <!-- 编辑区域 -->
    <view class="edit-area" :class="currentTheme">
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
          class="markdown-preview"
          v-html="renderedContent"
        ></view>
      </view>
    </view>

    <!-- 工具栏 -->
    <view class="mini-toolbar">
      <view class="tool-left">
        <view class="mini-tool-group">
          <uni-popup ref="colorPopup" type="bottom">
            <view class="color-picker">
              <view class="color-list">
                <view 
                  v-for="color in colorList" 
                  :key="color.value"
                  class="mini-color-item"
                  :class="{ active: backgroundColor === color.value }"
                  :style="{ backgroundColor: color.value }"
                  @click="selectColor(color.value)"
                >
                  <uni-icons 
                    v-if="backgroundColor === color.value"
                    type="checkmarkempty" 
                    size="12" 
                    color="#FFFFFF"
                  ></uni-icons>
                </view>
              </view>
            </view>
          </uni-popup>
          <view 
            class="color-dot" 
            :style="{ backgroundColor }"
            @click="showColorPicker"
          ></view>
          <uni-icons 
            type="font" 
            size="24" 
            color="#374151" 
            @click="showThemeSelector"
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
      <view class="mini-word-count">{{ content.length }}/5000</view>
    </view>

    <!-- 更多操作菜单 -->
    <uni-popup ref="popup" type="bottom">
      <view class="popup-content">
        <view class="popup-list">
          
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'

// 状态
const title = ref('')
const content = ref('')
const noteId = ref<number | null>(null)
const popup = ref()
const colorPopup = ref()
const hasChanges = ref(false)
const lastSaveTime = ref(Date.now())
const autoSaveInterval = ref<number | null>(null)
const backgroundColor = ref('#FFFFFF')
const isFavorite = ref(false)
const isPinned = ref(false)
const showColorPanel = ref(false)
const isPreview = ref(false)
const renderedContent = ref('')

// 颜色列表
const colorList = [
  { name: '默认', value: '#FFFFFF' },
  { name: '暖黄', value: '#FFF7E6' },
  { name: '粉红', value: '#FFF1F0' },
  { name: '薄荷', value: '#F6FFED' },
  { name: '天蓝', value: '#E6F7FF' },
  { name: '紫色', value: '#F9F0FF' }
]

// 主题列表
const themes = [
  { name: '默认', value: 'newsprint' },
  { name: 'Github', value: 'github' },
  { name: 'Whitey', value: 'whitey' },
  { name: 'Night', value: 'night' },
  { name: 'Pixyll', value: 'pixyll' }
]

// 当前主题
const currentTheme = ref('Github')

// 生命周期
onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    noteId.value = parseInt(options.id)
    loadNote()
  }
  if (options?.content) {
    content.value = decodeURIComponent(options.content)
  }
})

onMounted(() => {
  // 启动自动保存
  autoSaveInterval.value = setInterval(autoSave, 30000) as unknown as number
  // 加载默认主题
  changeTheme(currentTheme.value)
})

onBeforeUnmount(() => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
})

// 返回拦截
onBackPress(() => {
  if (hasChanges.value) {
    saveNote()
  }
  return false
})

// 加载笔记
const loadNote = () => {
  if (!noteId.value) return
  
  try {
    const notes = uni.getStorageSync('notes') || []
    const note = notes.find((n: any) => n.id === noteId.value)
    if (note) {
      title.value = note.title
      content.value = note.content
      backgroundColor.value = note.backgroundColor || '#FFFFFF'
      isFavorite.value = note.isFavorite || false
      isPinned.value = note.isPinned || false
    }
  } catch (e) {
    console.error('加载笔记失败:', e)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 保存笔记
const saveNote = () => {
  if (!title.value && !content.value) {
    goBack()
    return
  }

  try {
    const notes = uni.getStorageSync('notes') || []
    const now = Date.now()
    
    const noteData = {
      title: title.value,
      content: content.value,
      backgroundColor: backgroundColor.value,
      isFavorite: isFavorite.value,
      isPinned: isPinned.value,
      updateTime: now
    }
    
    if (noteId.value) {
      // 更新现有笔记
      const index = notes.findIndex((n: any) => n.id === noteId.value)
      if (index > -1) {
        notes[index] = {
          ...notes[index],
          ...noteData
        }
      }
    } else {
      // 创建新笔记
      const newNote = {
        id: now,
        createTime: now,
        ...noteData
      }
      notes.unshift(newNote)
      noteId.value = now
    }
    
    uni.setStorageSync('notes', notes)
    lastSaveTime.value = now
    hasChanges.value = false
    
    uni.showToast({
      title: '已保存',
      icon: 'success'
    })
  } catch (e) {
    console.error('保存笔记失败:', e)
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  }
}

// 自动保存
const autoSave = () => {
  if (hasChanges.value && Date.now() - lastSaveTime.value >= 30000) {
    saveNote()
  }
}

// 输入处理
const onTitleInput = () => {
  hasChanges.value = true
}

const onContentInput = () => {
  hasChanges.value = true
  renderedContent.value = formatMarkdown(content.value)
}

// 返回处理
const goBack = () => {
  if (hasChanges.value) {
    uni.showModal({
      title: '提示',
      content: '是否保存更改？',
      cancelText: '不保存',
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) {
          saveNote()
        }
        uni.navigateBack()
      }
    })
  } else {
    uni.navigateBack()
  }
}

// 显示主题选择器
const showThemeSelector = () => {
  uni.showActionSheet({
    itemList: themes.map(theme => theme.name),
    success: (res) => {
      const selectedTheme = themes[res.tapIndex].value
      changeTheme(selectedTheme)
    }
  })
}

// 改变主题
const changeTheme = (themeName: string) => {
  currentTheme.value = themeName
  // 动态加载主题CSS
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `/src/static/css/${themeName}.css`
  // 移除之前的主题
  const oldTheme = document.querySelector('link[data-theme]')
  if (oldTheme) {
    oldTheme.remove()
  }
  link.setAttribute('data-theme', 'true')
  document.head.appendChild(link)
}

// 收藏和置顶
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  hasChanges.value = true
}

const togglePin = () => {
  isPinned.value = !isPinned.value
  hasChanges.value = true
}

// 更多操作菜单
const showMoreActions = () => {
  popup.value.open()
}

const closePopup = () => {
  popup.value.close()
}

// 分享处理
const handleShare = () => {
  closePopup()
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none'
  })
}

// Markdown 格式化
const formatMarkdown = (text: string) => {
  if (!text) return ''
  
  // 处理标题
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>')
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>')
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>')
  
  // 处理引用
  text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
  
  // 处理粗体
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // 处理斜体
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // 处理代码块
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // 处理行内代码
  text = text.replace(/`(.*?)`/g, '<code>$1</code>')
  
  // 处理列表
  text = text.replace(/^\- (.*$)/gm, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>)/gm, '<ul>$1</ul>')
  
  // 处理换行
  text = text.replace(/\n/g, '<br>')
  
  return text
}

// 颜色选择器
const showColorPicker = () => {
  colorPopup.value.open()
}

const selectColor = (color: string) => {
  backgroundColor.value = color
  hasChanges.value = true
  colorPopup.value.close()
}

// 切换预览模式
const togglePreview = () => {
  isPreview.value = !isPreview.value
  if (isPreview.value) {
    renderedContent.value = formatMarkdown(content.value)
  }
}
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
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #E5E7EB;
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

.edit-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background-color: transparent;

  &.newsprint, &.github, &.whitey, &.night, &.pixyll {
    h1 {
      font-size: 2em;
      margin-bottom: 0.5em;
      border-bottom: 1px solid #eaecef;
    }

    h2 {
      font-size: 1.5em;
      margin-bottom: 0.5em;
      border-bottom: 1px solid #eaecef;
    }

    h3 {
      font-size: 1.25em;
      margin-bottom: 0.5em;
    }

    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 1em 0;
    }

    code {
      background-color: rgba(27,31,35,0.05);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace;
    }

    pre code {
      display: block;
      padding: 1em;
      overflow-x: auto;
    }

    li {
      margin-left: 1em;
      list-style-type: disc;
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
}

.content-wrapper {
  position: relative;
  flex: 1;
  height: calc(100% - 60px);
}

.content-input,
.markdown-preview {
  width: 100%;
  height: 100%;
  font-size: 16px;
  line-height: 1.6;
  background: transparent;
  border: none;
  outline: none;
  overflow-y: auto;
}

.markdown-preview {
  padding: 8px;
  
  h1, h2, h3 {
    margin: 16px 0 8px;
    font-weight: bold;
  }
  
  h1 {
    font-size: 24px;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 8px;
  }
  
  h2 {
    font-size: 20px;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 6px;
  }
  
  h3 {
    font-size: 18px;
  }
  
  blockquote {
    margin: 16px 0;
    padding: 0 16px;
    color: #6a737d;
    border-left: 4px solid #dfe2e5;
  }
  
  code {
    background-color: rgba(27,31,35,0.05);
    border-radius: 3px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 85%;
    padding: 0.2em 0.4em;
  }
  
  pre {
    background-color: #f6f8fa;
    border-radius: 3px;
    padding: 16px;
    overflow: auto;
    
    code {
      background-color: transparent;
      padding: 0;
      font-size: 100%;
    }
  }
  
  ul {
    padding-left: 20px;
    margin: 8px 0;
    
    li {
      list-style-type: disc;
      margin: 4px 0;
    }
  }
}

.mini-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid #E5E7EB;
  height: 18%;
}

.tool-left {
  display: flex;
  align-items: center;
}

.mini-tool-group {
  display: flex;
  align-items: center;
  gap: 24px;
}

.tool-icon {
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.color-picker {
  background-color: #FFFFFF;
  border-radius: 12px 12px 0 0;
  padding: 16px;
}

.color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.mini-color-item {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &.active {
    border: 2px solid #3B82F6;
  }
}

.mini-word-count {
  font-size: 12px;
  color: #9CA3AF;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.popup-content {
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 12px 12px 0 0;
}

.popup-list {
  padding: 12px 16px;
}

.popup-item {
  padding: 12px 16px;
  
  text {
    font-size: 14px;
    margin-left: 8px;
  }
}

.popup-cancel {
  font-size: 14px;
  padding: 12px;
}

@media screen and (max-width: 375px) {
  .mini-toolbar {
    padding: 6px 12px;
    height: 36px;
  }
  
  .mini-tool-group {
    gap: 12px;
  }
  
  .color-dot {
    width: 18px;
    height: 18px;
  }
  
  .mini-color-item {
    width: 32px;
    height: 32px;
  }
}
</style> 