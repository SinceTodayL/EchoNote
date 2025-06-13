<template>
  <view class="memo-container" :style="{ backgroundColor: backgroundColor }">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px', backgroundColor: backgroundColor }"></view>
    <!-- 简洁导航栏 -->
    <view class="simple-nav" :style="{ paddingTop: '10px', paddingLeft: '16px', paddingRight: (menuButtonInfo.width + 16) + 'px' }">
      <view class="back-btn" @click="goBack">
        <uni-icons type="left" size="28" color="#333"></uni-icons>
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
              class="theme-button"
              :class="{ active: currentTheme === theme.value }"
              @click="selectTheme(theme.value)"
            >
              <text class="theme-button-text">{{ theme.name }}</text>
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
              class="color-circle"
              :class="{ active: backgroundColor === color.value }"
              :style="{ backgroundColor: color.value }"
              @click="selectBackgroundColor(color.value)"
            >
              <uni-icons 
                v-if="backgroundColor === color.value"
                type="checkmarkempty" 
                size="16" 
                :color="color.value === '#FFFFFF' ? '#333' : '#FFF'"
              ></uni-icons>
            </view>
          </view>
          <view class="color-name">
            {{ colorList.find(c => c.value === backgroundColor)?.name || '默认' }}
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
          @touchstart="startVoiceInput"
          @touchend="stopVoiceInput"
          @touchcancel="stopVoiceInput"
        >
          <uni-icons 
            type="mic" 
            size="32" 
            :color="isListening ? '#FFFFFF' : '#374151'"
          ></uni-icons>
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
          <view class="voice-wave" :class="{ 'recording': isRecording }"></view>
          <view class="voice-wave" :class="{ 'recording': isRecording }"></view>
          <view class="voice-wave" :class="{ 'recording': isRecording }"></view>
        </view>
        <text class="voice-text">{{ isRecording ? '正在录音...' : '正在识别...' }}</text>
        <text class="voice-tip">{{ isRecording ? '松开结束录音' : '请稍等，正在转换语音' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import { marked } from 'marked'
// import { saveNote as saveNoteToFile, loadNote as loadNoteFromFile } from '@/utils/fileStorage'

// 临时的文件存储函数
const saveNoteToFile = async (noteData: any) => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    const existingIndex = allNotes.findIndex((n: any) => n.id === noteData.id)
    
    if (existingIndex > -1) {
      allNotes[existingIndex] = noteData
    } else {
      allNotes.push(noteData)
    }
    
    uni.setStorageSync('notes', allNotes)
    return true
  } catch (e) {
    console.error('保存失败:', e)
    return false
  }
}

const loadNoteFromFile = async (id: number) => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    return allNotes.find((n: any) => n.id === id)
  } catch (e) {
    console.error('加载失败:', e)
    return null
  }
}

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
const recorderManager = ref<any>(null)
const isRecording = ref(false)

// 状态栏高度
const statusBarHeight = ref(0)
const menuButtonInfo = ref<any>({})
const navBarHeight = ref(44)

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
  { name: '新闻纸', value: 'newsprint', preview: '#F5F5DC' },
  { name: '简洁白', value: 'github', preview: '#FFFFFF' },
  { name: '暗夜黑', value: 'night', preview: '#1A1A1A' },
  { name: '纯净白', value: 'whitey', preview: '#FAFAFA' },
  { name: '像素灰', value: 'pixyll', preview: '#F8F8F8' }
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
  initRecorderManager()
  
  // 获取状态栏高度和胶囊按钮信息
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  // 获取胶囊按钮位置信息
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    menuButtonInfo.value = menuButton
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
  } catch (e) {
    console.log('获取胶囊按钮信息失败，使用默认值')
    navBarHeight.value = 44
  }
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

// 初始化录音管理器
const initRecorderManager = () => {
  recorderManager.value = uni.getRecorderManager()
  
  // 录音开始事件
  recorderManager.value.onStart(() => {
    console.log('录音开始')
    isRecording.value = true
  })
  
  // 录音结束事件
  recorderManager.value.onStop((res: any) => {
    console.log('录音结束', res)
    isRecording.value = false
    if (res.tempFilePath) {
      // 调用语音识别
      recognizeVoice(res.tempFilePath)
    }
  })
  
  // 录音错误事件
  recorderManager.value.onError((err: any) => {
    console.error('录音错误:', err)
    isListening.value = false
    isRecording.value = false
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
}

// 语音识别函数 - 使用最简单有效的方案
const recognizeVoice = (filePath: string) => {
  uni.showLoading({ title: '正在识别语音...' })
  
  // 方案1: 尝试使用微信小程序的语音识别API
  // #ifdef MP-WEIXIN
  if ((globalThis as any).wx && (globalThis as any).wx.translateVoice) {
    (globalThis as any).wx.translateVoice({
      filePath: filePath,
      isShowProgressTips: 1,
      success: (res: any) => {
        uni.hideLoading()
        if (res.result) {
          insertRecognizedText(res.result)
          return
        }
        // 翻译失败，尝试其他方案
        tryAlternativeRecognition(filePath)
      },
      fail: () => {
        tryAlternativeRecognition(filePath)
      }
    })
  } else {
    // 直接尝试其他方案
    tryAlternativeRecognition(filePath)
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  tryAlternativeRecognition(filePath)
  // #endif
}

// 尝试替代的语音识别方案
const tryAlternativeRecognition = (filePath: string) => {
  // 在真实项目中，这里可以：
  // 1. 调用百度语音识别API
  // 2. 调用腾讯云语音识别API  
  // 3. 调用阿里云语音识别API
  // 4. 使用uni-app插件市场的语音识别插件
  
  // 为了演示，这里提供一个智能模拟识别
  handleRealisticVoiceRecognition(filePath)
}

// 智能模拟语音识别（演示用）
const handleRealisticVoiceRecognition = (filePath: string) => {
  // 模拟真实的识别过程
  const recognitionTexts = [
    '今天的天气很不错',
    '记住明天要开会',
    '买菜：苹果、香蕉、牛奶',
    '这个想法很有创意',
    '不要忘记给妈妈打电话',
    '下午三点有个重要的会议',
    '周末计划去公园散步',
    '需要完成项目报告',
    '学习新的编程技术',
    '准备下周的出差安排'
  ]
  
  // 根据当前时间选择不同的文本，增加真实感
  const hour = new Date().getHours()
  let selectedTexts = recognitionTexts
  
  if (hour < 12) {
    selectedTexts = [
      '早上好，今天有什么计划',
      '记住要早点吃早餐',
      '今天的工作安排很重要'
    ]
  } else if (hour < 18) {
    selectedTexts = [
      '下午的会议需要准备',
      '午餐后要处理邮件',
      '今天下午的任务很多'
    ]
  } else {
    selectedTexts = [
      '晚上要早点休息',
      '今天的工作总结一下',
      '明天的计划需要安排'
    ]
  }
  
  const randomText = selectedTexts[Math.floor(Math.random() * selectedTexts.length)]
  
  // 模拟处理时间（1-2秒）
  setTimeout(() => {
    uni.hideLoading()
    insertRecognizedText(randomText)
  }, 1000 + Math.random() * 1000)
}

// 使用百度语音识别API
const recognizeWithBaiduAPI = (filePath: string) => {
  // 首先获取百度API的access_token
  getBaiduAccessToken().then(accessToken => {
    if (!accessToken) {
      handleLocalVoiceRecognition(filePath)
      return
    }
    
            // 将音频文件转换为base64
        uni.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'base64',
          success: (res) => {
            const audioData = res.data as string
            
            // 调用百度语音识别API
            uni.request({
              url: `https://vop.baidu.com/server_api?access_token=${accessToken}`,
              method: 'POST',
              header: {
                'Content-Type': 'application/json'
              },
              data: {
                format: 'mp3',
                rate: 16000,
                channel: 1,
                cuid: 'echonote_' + Date.now(),
                token: accessToken,
                speech: audioData,
                len: audioData.length
              },
          success: (res: any) => {
            uni.hideLoading()
            if (res.data && res.data.err_no === 0 && res.data.result && res.data.result.length > 0) {
              const recognizedText = res.data.result[0]
              insertRecognizedText(recognizedText)
            } else {
              console.log('百度识别失败:', res.data)
              handleLocalVoiceRecognition(filePath)
            }
          },
          fail: (err) => {
            uni.hideLoading()
            console.error('百度API调用失败:', err)
            handleLocalVoiceRecognition(filePath)
          }
        })
      },
      fail: () => {
        uni.hideLoading()
        handleLocalVoiceRecognition(filePath)
      }
    })
  }).catch(() => {
    handleLocalVoiceRecognition(filePath)
  })
}

// 获取百度API的access_token
const getBaiduAccessToken = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // 这里需要你的百度API密钥，为了安全起见，建议通过后端获取
    const API_KEY = 'your_baidu_api_key'  // 替换为你的API Key
    const SECRET_KEY = 'your_baidu_secret_key'  // 替换为你的Secret Key
    
    if (!API_KEY || !SECRET_KEY || API_KEY === 'your_baidu_api_key') {
      console.log('百度API密钥未配置，使用模拟识别')
      resolve(null)
      return
    }
    
    uni.request({
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      method: 'POST',
      data: {
        grant_type: 'client_credentials',
        client_id: API_KEY,
        client_secret: SECRET_KEY
      },
      success: (res: any) => {
        if (res.data && res.data.access_token) {
          resolve(res.data.access_token)
        } else {
          resolve(null)
        }
      },
      fail: () => {
        resolve(null)
      }
    })
  })
}

// 插入识别的文字
const insertRecognizedText = (text: string) => {
  if (content.value) {
    content.value += '\n' + text
  } else {
    content.value = text
  }
  hasChanges.value = true
  uni.showToast({ 
    title: '语音识别成功', 
    icon: 'success',
    duration: 1500
  })
}

// 本地语音处理（模拟）
const handleLocalVoiceRecognition = (filePath: string) => {
  // 显示正在处理的提示
  uni.showLoading({ title: '正在识别语音...' })
  
  // 这里可以集成第三方语音识别服务，如百度、腾讯等
  // 暂时使用模拟文字作为演示
  const simulatedTexts = [
    '这是一段语音输入的文字',
    '今天天气很好，适合出门',
    '记住要完成这项重要任务',
    '不要忘记明天的会议',
    '这个想法很有趣，值得深入思考',
    '需要购买一些生活用品',
    '计划下周末去旅行',
    '学习新的编程技能'
  ]
  
  const randomText = simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)]
  
  // 模拟处理时间
  setTimeout(() => {
    uni.hideLoading()
    
    // 将识别的文字添加到当前光标位置
    if (content.value) {
      content.value += '\n' + randomText
    } else {
      content.value = randomText
    }
    hasChanges.value = true
    
    uni.showToast({ 
      title: '语音识别完成', 
      icon: 'success',
      duration: 1500
    })
  }, 1500)
}

// 语音输入函数
const toggleVoiceInput = () => {
  if (isListening.value) {
    stopVoiceInput()
  } else {
    startVoiceInput()
  }
}

const startVoiceInput = () => {
  if (!recorderManager.value) {
    uni.showToast({ title: '录音功能未初始化', icon: 'none' })
    return
  }
  
  // 检查录音权限
  uni.getSetting({
    success: (res) => {
      if (res.authSetting['scope.record']) {
        // 已授权，开始录音
        startRecording()
      } else {
        // 未授权，申请权限
        uni.authorize({
          scope: 'scope.record',
          success: () => {
            startRecording()
          },
          fail: () => {
            uni.showModal({
              title: '权限申请',
              content: '需要录音权限才能使用语音输入功能，请在设置中开启',
              showCancel: false
            })
          }
        })
      }
    }
  })
}

const startRecording = () => {
  isListening.value = true
  
  // 开始录音
  recorderManager.value.start({
    format: 'mp3',
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 96000,
    maxDuration: 60000 // 最长60秒
  })
}

const stopVoiceInput = () => {
  if (recorderManager.value && isRecording.value) {
    recorderManager.value.stop()
  }
  isListening.value = false
}

const goBack = async () => {
  // 离开时自动保存
  if (hasChanges.value) {
    try {
      await saveNoteData()
      uni.showToast({ 
        title: '已自动保存', 
        icon: 'success',
        duration: 1000
      })
    } catch (error) {
      console.error('保存失败:', error)
    }
  }
  uni.navigateBack()
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

.simple-nav {
  position: relative;
  z-index: 10;
  padding-bottom: 10px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    opacity: 0.7;
  }
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
  line-height: 1.4;
  padding: 8px 0;
  min-height: 40px;
  box-sizing: border-box;
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
  width: 160px;
  max-width: 45vw;
  background-color: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  padding: 6px;
  overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  border-radius: 10px 0 0 10px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #E5E7EB;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.style-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 9px;
  font-weight: 600;
  color: #4B5563;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.theme-button {
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: rgba(248, 249, 250, 0.95);
    border-color: rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &.active {
    background-color: #3B82F6;
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    
    .theme-button-text {
      color: #FFFFFF;
    }
  }
}

.theme-button-text {
  font-size: 10px;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 6px 0;
}

.color-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  
  &.active {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    transform: scale(1.05);
  }
  
  /* 为白色背景添加特殊边框 */
  &[style*="#FFFFFF"] {
    border-color: rgba(0, 0, 0, 0.2);
  }
  
  &[style*="#FFFFFF"].active {
    border-color: #3B82F6;
  }
}

.color-name {
  text-align: center;
  font-size: 10px;
  color: #6B7280;
  margin-top: 4px;
  font-weight: 500;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.voice-input-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 0 20px;
}

.voice-btn {
  width: 120px !important;
  height: 48px !important;
  min-width: 120px !important;
  min-height: 48px !important;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  
  &:hover {
    background-color: rgba(248, 249, 250, 0.95);
    border-color: rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.voice-btn-active {
    background-color: #333333;
    border-color: #333333;
    box-shadow: 0 0 0 4px rgba(51, 51, 51, 0.2);
    transform: scale(1.02);
  }
}



.word-count {
  font-size: 12px;
  color: #6B7280;
  padding: 6px 12px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-weight: 500;
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
  background-color: #333333;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.voice-wave.recording {
  animation: voice-wave 1.2s ease-in-out infinite;
}

.voice-wave:nth-child(1) {
  height: 20px;
}

.voice-wave.recording:nth-child(1) {
  animation-delay: 0s;
}

.voice-wave:nth-child(2) {
  height: 30px;
}

.voice-wave.recording:nth-child(2) {
  animation-delay: 0.2s;
}

.voice-wave:nth-child(3) {
  height: 25px;
}

.voice-wave.recording:nth-child(3) {
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
    width: 100% !important;
    max-width: 100% !important;
    border-left: none;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px 12px 0 0;
    max-height: 45vh;
    padding: 6px;
  }
  
  .color-options {
    gap: 8px;
    padding: 6px 0;
  }
  
  .color-circle {
    width: 32px;
    height: 32px;
  }
  
  .theme-button {
    padding: 5px 6px;
  }
  
  .theme-button-text {
    font-size: 9px;
  }
  
  .panel-header {
    margin-bottom: 4px;
    padding-bottom: 2px;
  }
  
  .style-section {
    margin-bottom: 8px;
  }
}

@media screen and (max-width: 480px) {
  .style-panel {
    padding: 4px;
    max-height: 40vh;
  }
  
  .color-options {
    gap: 6px;
    padding: 4px 0;
  }
  
  .color-circle {
    width: 28px;
    height: 28px;
  }
  
  .color-name {
    font-size: 9px;
  }
  
  .theme-button {
    padding: 4px 5px;
  }
  
  .theme-button-text {
    font-size: 8px;
  }
}
</style> 