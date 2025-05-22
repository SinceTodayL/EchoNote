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

    <!-- 工具栏 -->
    <view class="toolbar">
      <view class="toolbar-top">
        <view class="tool-group">
          <view class="tool-item color-picker-trigger" @click="showColorPicker">
            <view class="color-preview" :style="{ backgroundColor: backgroundColor }"></view>
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
        </view>
      </view>
      
      <!-- 语音输入按钮 -->
      <view class="voice-input-bar">
        <view 
          class="voice-btn" 
          :class="{ 'recording': isRecording }"
          @touchstart.prevent="startVoiceInput"
          @touchend.prevent="stopVoiceInput"
          @touchcancel.prevent="stopVoiceInput"
          @mousedown.prevent="startVoiceInput"
          @mouseup.prevent="stopVoiceInput"
          @mouseleave.prevent="stopVoiceInput"
        >
          <uni-icons 
            :type="isRecording ? 'mic-filled' : 'mic'" 
            size="28" 
            :color="isRecording ? '#FFFFFF' : '#374151'"
          ></uni-icons>
          <text class="voice-btn-text">{{ isRecording ? '松开结束' : '按住说话' }}</text>
        </view>
      </view>
    </view>

    <!-- 颜色选择器弹窗 -->
    <uni-popup ref="colorPopup" type="bottom">
      <view class="color-picker">
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

    <!-- 录音状态遮罩 -->
    <view v-if="isRecording" class="recording-overlay">
      <view class="recording-content">
        <view class="recording-wave"></view>
        <text class="recording-tip">{{ tempVoiceResult || '正在聆听...' }}</text>
        <text class="recording-status">{{ recordingStatus }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { SpeechRecognition, xunfeiConfig } from '../../utils/speechRecognition'

// 状态
const title = ref('')
const content = ref('')
const backgroundColor = ref('#F9FAFB')
const isFavorite = ref(false)
const isPinned = ref(false)
const colorPopup = ref()
const memoId = ref<number | null>(null)
const isRecording = ref(false)
const recordingStatus = ref('')
const speechRecognition = ref<SpeechRecognition | null>(null)
let saveTimer: ReturnType<typeof setInterval> | null = null
const originalMemo = ref<any>(null)
const initialCursorPosition = ref(0)
const tempVoiceResult = ref('')

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
  if (isRecording.value) {
    stopVoiceInput({ preventDefault: () => {}, stopPropagation: () => {} })
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

// 初始化语音识别
onMounted(async () => {
  try {
    console.log('开始初始化语音识别组件...')

    // #ifdef H5
    console.log('检查H5环境支持...')
    if (!navigator.mediaDevices) {
      // 在某些浏览器中，需要先请求权限才能访问 mediaDevices
      if ((navigator as any).mediaDevices === undefined) {
        (navigator as any).mediaDevices = {};
      }

      if ((navigator as any).mediaDevices.getUserMedia === undefined) {
        (navigator as any).mediaDevices.getUserMedia = function(constraints) {
          const getUserMedia = (navigator as any).webkitGetUserMedia || 
                             (navigator as any).mozGetUserMedia;

          if (!getUserMedia) {
            return Promise.reject(new Error('浏览器不支持 getUserMedia'));
          }

          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
      }
    }

    // 测试麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      console.log('麦克风权限测试成功')
    } catch (err) {
      console.error('麦克风权限测试失败:', err)
      throw new Error('请允许使用麦克风')
    }
    // #endif

    console.log('创建语音识别实例...')
    speechRecognition.value = new SpeechRecognition(xunfeiConfig)
    console.log('语音识别初始化成功')

  } catch (error: any) {
    console.error('语音识别初始化失败:', error)
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    uni.showModal({
      title: '提示',
      content: `语音识别功能初始化失败: ${errorMsg}`,
      showCancel: false
    })
  }
})

// 检查麦克风权限
const checkMicrophonePermission = () => {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          uni.authorize({
            scope: 'scope.record',
            success: () => {
              console.log('麦克风权限获取成功')
              resolve(true)
            },
            fail: (err) => {
              console.error('麦克风权限获取失败:', err)
              // 引导用户去设置页面开启权限
              uni.showModal({
                title: '提示',
                content: '需要麦克风权限才能使用语音输入功能，是否去设置？',
                success: (res) => {
                  if (res.confirm) {
                    uni.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.record']) {
                          resolve(true)
                        } else {
                          reject(new Error('用户未授权麦克风权限'))
                        }
                      }
                    })
                  } else {
                    reject(new Error('用户拒绝授权麦克风权限'))
                  }
                }
              })
            }
          })
        } else {
          resolve(true)
        }
      },
      fail: reject
    })
    // #endif

    // #ifdef H5
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('H5 麦克风权限获取成功')
          resolve(true)
        })
        .catch((err) => {
          console.error('H5 麦克风权限获取失败:', err)
          reject(new Error('请允许浏览器使用麦克风'))
        })
    } else {
      reject(new Error('当前环境不支持录音'))
    }
    // #endif

    // #ifdef APP-PLUS
    plus.android.requestPermissions(
      ['android.permission.RECORD_AUDIO'],
      function(resultObj) {
        if (resultObj.granted.length === 1) {
          resolve(true)
        } else {
          reject(new Error('用户拒绝授权麦克风权限'))
        }
      },
      function(error) {
        reject(new Error('请求权限失败'))
      }
    )
    // #endif
  })
}

// 开始语音输入
const startVoiceInput = async (event: any) => {
  try {
    console.log('开始语音输入流程...')
    event?.preventDefault?.()
    event?.stopPropagation?.()

    if (isRecording.value) {
      console.log('已经在录音中')
      return
    }

    // #ifdef H5
    // 在H5环境中，再次检查麦克风权限
    try {
      console.log('检查麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      console.log('麦克风权限已确认')
    } catch (err) {
      console.error('获取麦克风权限失败:', err)
      throw new Error('请允许使用麦克风')
    }
    // #endif

    // #ifdef APP-PLUS || MP-WEIXIN
    await checkMicrophonePermission()
    // #endif

    // 保存当前光标位置
    // #ifdef H5
    const textarea = document.querySelector('.content-input') as HTMLTextAreaElement
    if (textarea) {
      initialCursorPosition.value = textarea.selectionStart || content.value.length
      console.log('保存光标位置:', initialCursorPosition.value)
    }
    // #endif

    // #ifdef APP-PLUS || MP-WEIXIN
    initialCursorPosition.value = content.value.length
    // #endif

    // 确保 SpeechRecognition 实例存在
    if (!speechRecognition.value) {
      console.log('重新创建语音识别实例...')
      speechRecognition.value = new SpeechRecognition(xunfeiConfig)
    }

    isRecording.value = true
    tempVoiceResult.value = ''
    recordingStatus.value = '准备开始...'

    console.log('启动语音识别...')
    await speechRecognition.value.startRecording(
      (text: string, isEnd: boolean) => {
        console.log('收到识别结果:', text, isEnd)
        tempVoiceResult.value = text

        if (isEnd && text) {
          const before = content.value.slice(0, initialCursorPosition.value)
          const after = content.value.slice(initialCursorPosition.value)
          content.value = before + text + after
          initialCursorPosition.value += text.length
          tempVoiceResult.value = ''
          console.log('已插入文本:', text)
        }
      },
      (status: string) => {
        console.log('识别状态更新:', status)
        recordingStatus.value = status
      }
    )

    // #ifdef APP-PLUS || MP-WEIXIN
    uni.vibrateShort({
      success: () => console.log('震动反馈')
    })
    // #endif

  } catch (error: any) {
    console.error('启动语音识别失败:', error)
    isRecording.value = false
    recordingStatus.value = ''
    uni.showModal({
      title: '提示',
      content: error.message || '启动语音识别失败，请检查麦克风权限',
      showCancel: false
    })
  }
}

// 停止语音输入
const stopVoiceInput = (event: any) => {
  try {
    console.log('停止语音输入')
    event?.preventDefault?.()
    event?.stopPropagation?.()

    if (!isRecording.value) {
      console.log('没有在录音')
      return
    }

    console.log('停止录音')
    speechRecognition.value?.stopRecording()
    isRecording.value = false

    // 震动反馈
    // #ifdef APP-PLUS || MP-WEIXIN
    uni.vibrateShort({
      success: () => console.log('震动反馈')
    })
    // #endif

  } catch (error) {
    console.error('停止语音识别失败:', error)
    isRecording.value = false
  }
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
  overflow-y: auto;
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
  background-color: #fff;
  border-top: 1px solid #E5E7EB;
  padding: 8px;
}

.toolbar-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tool-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tool-item {
  padding: 8px;
  border-radius: 8px;
}

.color-picker-trigger {
  display: flex;
  align-items: center;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
}

.voice-input-bar {
  padding: 8px 16px;
}

.voice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #F3F4F6;
  padding: 12px;
  border-radius: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.voice-btn:active {
  background-color: #E5E7EB;
  transform: scale(0.98);
}

.voice-btn.recording {
  background-color: #EF4444;
}

.voice-btn.recording:active {
  background-color: #DC2626;
}

.voice-btn-text {
  font-size: 14px;
  color: #374151;
}

.voice-btn.recording .voice-btn-text {
  color: #FFFFFF;
}

.color-picker {
  background-color: #fff;
  padding: 16px;
}

.color-list {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}

.color-item {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 1px solid #E5E7EB;
}

.recording-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.recording-content {
  background-color: #fff;
  padding: 24px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 200px;
  max-width: 80%;
}

.recording-wave {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: #FEE2E2;
  position: relative;
  animation: pulse 1.5s infinite;
}

.recording-tip {
  font-size: 16px;
  color: #111827;
  font-weight: 500;
  text-align: center;
  min-height: 48px;
  display: flex;
  align-items: center;
}

.recording-status {
  font-size: 14px;
  color: #6B7280;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 16px rgba(239, 68, 68, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
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

  .voice-btn {
    background-color: #374151;
  }

  .voice-btn-text {
    color: #D1D5DB;
  }

  .recording-content {
    background-color: #1E1E1E;
  }

  .recording-tip {
    color: #F3F4F6;
  }

  .recording-status {
    color: #9CA3AF;
  }

  .color-picker {
    background-color: #1E1E1E;
  }

  .color-item {
    border-color: #374151;
  }
}
</style> 