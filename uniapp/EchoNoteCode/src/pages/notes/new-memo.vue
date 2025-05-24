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
    <view class="edit-area">
      <input
        class="title-input"
        type="text"
        v-model="title"
        placeholder="标题"
        :maxlength="50"
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
            :type="isFavorite ? 'star-filled' : 'star'" 
            size="18" 
            :color="isFavorite ? '#F59E0B' : '#9CA3AF'"
            @click="toggleFavorite"
            class="tool-icon"
          ></uni-icons>
          <uni-icons 
            :type="isPinned ? 'pushpin-filled' : 'pushpin'" 
            size="18" 
            :color="isPinned ? '#3B82F6' : '#9CA3AF'"
            @click="togglePin"
            class="tool-icon"
          ></uni-icons>
        </view>
      </view>
      <view class="mini-word-count">{{ content.length }}/5000</view>
    </view>

    <!-- 更多操作菜单 -->
    <uni-popup ref="popup" type="bottom">
      <view class="popup-content">
        <view class="popup-list">
          <view class="popup-item" @click="handleShare">
            <uni-icons type="redo" size="20" color="#374151"></uni-icons>
            <text>分享</text>
          </view>
          <view class="popup-item" @click="handleDelete">
            <uni-icons type="trash" size="20" color="#374151"></uni-icons>
            <text>删除</text>
          </view>
        </view>
        <view class="popup-cancel" @click="closePopup">取消</view>
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

// 颜色列表
const colorList = [
  { name: '默认', value: '#FFFFFF' },
  { name: '暖黄', value: '#FFF7E6' },
  { name: '粉红', value: '#FFF1F0' },
  { name: '薄荷', value: '#F6FFED' },
  { name: '天蓝', value: '#E6F7FF' },
  { name: '紫色', value: '#F9F0FF' },
  { name: '灰色', value: '#FAFAFA' }
]

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

// 颜色选择器
const showColorPicker = () => {
  colorPopup.value.open()
}

const selectColor = (color: string) => {
  backgroundColor.value = color
  hasChanges.value = true
  colorPopup.value.close()
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

// 删除处理
const handleDelete = () => {
  closePopup()
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条备忘录吗？',
    success: (res) => {
      if (res.confirm && noteId.value) {
        try {
          const notes = uni.getStorageSync('notes') || []
          const newNotes = notes.filter((n: any) => n.id !== noteId.value)
          uni.setStorageSync('notes', newNotes)
          uni.navigateBack()
        } catch (e) {
          console.error('删除笔记失败:', e)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
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
}

.title-input {
  font-size: 20px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 12px;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  
  &::placeholder {
    color: #9CA3AF;
  }
}

.content-input {
  font-size: 16px;
  line-height: 1.6;
  color: #374151;
  width: 100%;
  height: calc(100% - 32px);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  
  &::placeholder {
    color: #9CA3AF;
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
  height: 40px;
}

.mini-tool-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #E5E7EB;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
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
  width: 100%;
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