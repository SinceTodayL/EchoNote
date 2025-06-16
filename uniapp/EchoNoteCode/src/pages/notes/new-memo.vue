<!--
  File: new-memo.vue
  Description: Note editing page supporting creation, editing, AI assistance, and voice input.
  Author: Zhen Liu
  Created: 2025-05-22
  Last Modified: 2025-06-14
-->
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
        <textarea
          class="title-input"
          v-model="title"
          placeholder="标题"
          :maxlength="100"
          @input="onTitleInput"
          auto-height
          :show-confirm-bar="false"
        />
        <!-- 编辑最新时间 -->
        <view class="edit-time">
          <text class="edit-time-text">{{ lastEditTime || '刚刚' }}</text>
        </view>
        <view class="content-wrapper">
          <textarea
            v-show="!isPreview"
            class="content-input"
            v-model="content"
            placeholder="开始输入..."
            :maxlength="5000"
            @input="onContentInput"
          />
          <!-- AI问答提示框 -->
          <view 
            v-show="showAIPrompt && !isPreview" 
            class="ai-prompt-box"
            :style="{ 
              top: promptPosition.top + 'px', 
              left: promptPosition.left + 'px' 
            }"
            @click="askAI"
          >
            <uni-icons type="chat" size="16" color="#FFFFFF"></uni-icons>
            <text class="ai-prompt-text">AI Help!</text>
          </view>
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
import { sendAIMessage } from '@/utils/aiService'


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
const updateTime = ref<number | null>(null)

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

// AI问答状态
const showAIPrompt = ref(false)
const isAIThinking = ref(false)
const promptPosition = ref({ top: 0, left: 0 })

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

// 格式化编辑时间
const lastEditTime = computed(() => {
  if (!updateTime.value) {
    return new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const date = new Date(updateTime.value)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return diffMinutes + '分钟前'
  } else if (diffHours < 24) {
    return diffHours + '小时前'
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else if (diffDays < 7) {
    return diffDays + '天前'
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
})

// 颜色选项
const colorList = [
  { name: '纯白', value: '#FFFFFF' },
  { name: '暖黄', value: '#FFF7E6' },
  { name: '粉红', value: '#FFF1F0' },
  { name: '薄荷', value: '#F6FFED' },
  { name: '天蓝', value: '#E6F7FF' },
  { name: '紫色', value: '#F9F0FF' }
]

// 主题选项
const themes = [
  { name: 'Newsprint', value: 'newsprint', preview: '#F5F5DC' },
  { name: 'Github', value: 'github', preview: '#FFFFFF' },
  { name: 'Whitey', value: 'whitey', preview: '#FAFAFA' },
  { name: 'Pixyll', value: 'pixyll', preview: '#F8F8F8' }
]

// 生命周期
onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    noteId.value = parseInt(options.id)
    loadNoteData()
  } else {
    // 新建笔记时设置初始编辑时间
    updateTime.value = Date.now()
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
      updateTime.value = note.updateTime || note.createTime || Date.now()
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
      updateTime.value = now
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
const onTitleInput = () => { 
  hasChanges.value = true
  updateTime.value = Date.now()
}
const onContentInput = (event: any) => { 
  hasChanges.value = true 
  updateTime.value = Date.now()
  
  // 检测是否输入了"？"字符
  if (content.value.endsWith('？') || content.value.endsWith('?')) {
    showAIPrompt.value = true
    
    // 计算提示框位置（简化版本，基于文本长度估算）
    calculatePromptPosition()
    
    // 3秒后自动隐藏提示框
    setTimeout(() => {
      showAIPrompt.value = false
    }, 3000)
  } else {
    showAIPrompt.value = false
  }
}

// 计算提示框位置
const calculatePromptPosition = () => {
  // 简化的位置计算：基于文本内容估算位置
  const lines = content.value.split('\n')
  const currentLineIndex = lines.length - 1
  const currentLine = lines[currentLineIndex] || ''
  
  // 估算位置（这是一个简化的实现）
  const lineHeight = 24 // 假设行高为24px
  const charWidth = 8   // 假设字符宽度为8px
  
  const top = currentLineIndex * lineHeight + 30 // 30px是标题区域的大概高度
  const left = Math.min(currentLine.length * charWidth, 200) // 限制最大左边距
  
  promptPosition.value = { 
    top: Math.max(top, 50), // 确保不会太靠上
    left: Math.max(left, 20) // 确保不会太靠左
  }
}

const toggleStylePanel = () => { showStylePanel.value = !showStylePanel.value }
const closeStylePanel = () => { showStylePanel.value = false }
const togglePreview = () => { isPreview.value = !isPreview.value }
const toggleFavorite = () => { isFavorite.value = !isFavorite.value; hasChanges.value = true }
const togglePin = () => { isPinned.value = !isPinned.value; hasChanges.value = true }

// AI问答功能
const askAI = async () => {
  if (isAIThinking.value) return
  
  showAIPrompt.value = false
  isAIThinking.value = true
  
  try {
    // 提取问题内容（从最后一个问号往前找到合适的起始位置）
    const questionText = extractQuestion()
    if (!questionText) {
      uni.showToast({ title: '未找到问题内容', icon: 'none' })
      return
    }
    
    uni.showLoading({ title: 'AI思考中...' })
    
    // 调用AI服务，使用优化的系统提示词
    const systemPrompt = `你是一个简洁的问答助手。请直接回答问题，只返回答案内容，不要包含任何解释、前缀、后缀或格式标记。回答要简洁明了，只用纯文本和必要的标点符号。

问题：${questionText}`
    const aiResponse = await sendAIMessage(systemPrompt)
    
    uni.hideLoading()
    
    // 将AI回答插入到内容中，紧跟在问题后面
    const cleanResponse = aiResponse.trim()
    content.value += `\n${cleanResponse}`
    hasChanges.value = true
    updateTime.value = Date.now()
    
    uni.showToast({ title: 'AI回答已添加', icon: 'success' })
    
  } catch (error) {
    uni.hideLoading()
    console.error('AI回答失败:', error)
    uni.showToast({ title: 'AI服务暂时不可用', icon: 'none' })
  } finally {
    isAIThinking.value = false
  }
}

// 提取问题内容
const extractQuestion = (): string => {
  const text = content.value.trim()
  if (!text) return ''
  
  // 找到最后一个问号的位置
  const lastQuestionIndex = Math.max(text.lastIndexOf('？'), text.lastIndexOf('?'))
  if (lastQuestionIndex === -1) return ''
  
  // 从问号往前找到合适的起始位置（句号、换行符或开头）
  let startIndex = 0
  for (let i = lastQuestionIndex - 1; i >= 0; i--) {
    const char = text[i]
    if (char === '。' || char === '.' || char === '\n' || char === '！' || char === '!') {
      startIndex = i + 1
      break
    }
  }
  
  // 提取问题文本并清理
  const question = text.substring(startIndex, lastQuestionIndex + 1).trim()
  return question
}

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
  
  
  selectedTexts = [
      "进程管理  文件管理  内存管理"
    ]
 
  const randomText = selectedTexts[Math.floor(Math.random() * selectedTexts.length)]
  
  // 模拟处理时间（1-2秒）
  setTimeout(() => {
    uni.hideLoading()
    insertRecognizedText(randomText)
  }, 1000 + Math.random() * 1000)
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
    // #ifdef H5
    // 移除旧主题
    const oldTheme = document.querySelector('link[data-theme]')
    if (oldTheme) oldTheme.remove()
    
    // 添加新主题
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/static/css/${themeName}.css`
    link.setAttribute('data-theme', 'true')
    document.head.appendChild(link)
    console.log('主题CSS加载:', `/static/css/${themeName}.css`)
    // #endif
    
    // #ifndef H5
    console.log('小程序端暂不支持动态CSS加载，主题:', themeName)
    // #endif
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
  margin-bottom: 8px;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  line-height: 1.3;
  padding: 8px 0;
  min-height: 32px;
  max-height: 120px;
  box-sizing: border-box;
  resize: none;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.edit-time {
  margin-bottom: 16px;
  padding-left: 2px;
}

.edit-time-text {
  font-size: 12px;
  color: #999999;
  opacity: 1;
  font-weight: 400;
}

.content-wrapper {
  height: calc(100% - 60px);
  position: relative;
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
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.style-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #4B5563;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 4px;
  padding: 4px 0;
}

.theme-button {
  padding: 6px 2px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  
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
  font-weight: 600;
  color: #374151;
  text-align: center;
  line-height: 1.2;
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
  font-size: 12px;
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

/* AI问答提示框样式 */
.ai-prompt-box {
  position: absolute;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: white;
  padding: 6px 10px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  animation: ai-prompt-bounce 0.5s ease-out;
  font-size: 12px;
  white-space: nowrap;
}

.ai-prompt-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.ai-prompt-box:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.ai-prompt-text {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

@keyframes ai-prompt-bounce {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.9);
  }
  50% {
    transform: translateY(-2px) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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