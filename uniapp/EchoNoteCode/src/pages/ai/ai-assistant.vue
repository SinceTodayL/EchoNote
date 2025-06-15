<template>
  <view class="ai-container">
    <!-- 固定顶部导航栏 -->
    <view class="fixed-header">
      <!-- 状态栏占位 -->
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      
      <!-- 顶部导航栏 -->
      <view class="nav-bar" :style="{ height: navBarHeight + 'px' }">
        <view class="nav-content">
          <button class="history-btn" @click="showHistory">
            <uni-icons type="list" size="18" color="#007AFF"></uni-icons>
          </button>
          <view class="nav-center">
            <text class="nav-title">EchoNote AI</text>
            <view class="connection-status">
              <view 
                class="status-dot" 
                :class="{
                  'checking': aiServiceStatus === 'checking',
                  'connected': aiServiceStatus === 'connected',
                  'error': aiServiceStatus === 'error'
                }"
              ></view>
              <text class="status-text">
                {{ 
                  aiServiceStatus === 'checking' ? '连接中...' :
                  aiServiceStatus === 'connected' ? '已连接' : '连接异常'
                }}
              </text>
            </view>
          </view>
          <view class="nav-right"></view>
        </view>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <view class="content-area" :style="{ paddingTop: (statusBarHeight + navBarHeight) + 'px' }">

    <!-- 历史记录侧边栏 -->
    <view class="history-sidebar" :class="{ 'show': showHistoryPanel }" @click="hideHistory">
      <view class="history-content" @click.stop>
        <view class="history-header">
          <text class="history-title">对话历史</text>
          <button class="close-btn" @click="hideHistory">
            <uni-icons type="close" size="16" color="#666"></uni-icons>
          </button>
        </view>
        <view class="new-chat-section">
          <button class="new-chat-btn" @click="startNewChat">
            <uni-icons type="plus" size="16" color="#ffffff"></uni-icons>
            <text class="new-chat-text">新建对话</text>
          </button>
        </view>
        <scroll-view scroll-y class="history-list">
          <view 
            v-for="(chat, index) in chatHistory" 
            :key="index" 
            class="history-item"
            :class="{ 'active': currentChatIndex === index }"
            @click="switchToChat(index)"
            @longpress="showDeleteConfirm(index)"
          >
            <view class="history-icon">
              <uni-icons type="chatbubble" size="14" color="#007AFF"></uni-icons>
            </view>
            <view class="history-info">
              <text class="history-text">{{ chat.title }}</text>
              <text class="history-time">{{ formatHistoryTime(chat.timestamp) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y="true" class="messages-container" :scroll-top="scrollTop" scroll-with-animation>
      <!-- 空状态 - EchoNote风格的欢迎界面 -->
      <view class="welcome-section" v-if="currentMessages.length === 0">
        <view class="welcome-content">
          <view class="welcome-info">
            <text class="welcome-text">EchoNote AI</text>
            <text class="welcome-desc">
              开始对话，让我为您提供更智能的帮助！
            </text>
          </view>
          
          <!-- 快捷建议 -->
          <view class="suggestions-grid">
            <button class="suggestion-btn" @click="quickSend('基于我的笔记，给我一些学习建议')">
              <text class="suggestion-text">🧠 基于我的笔记给建议</text>
            </button>
            <button class="suggestion-btn" @click="quickSend('我的笔记之间有什么联系？')">
              <text class="suggestion-text">🔗 发现笔记间的联系</text>
            </button>
            <button class="suggestion-btn" @click="quickSend('根据我的待办事项，制定今天的计划')">
              <text class="suggestion-text">📅 制定今日计划</text>
            </button>

            <button class="suggestion-btn" @click="quickSend('搜索笔记：项目')">
              <text class="suggestion-text">🔍 搜索我的笔记</text>
            </button>
          </view>
        

        </view>
      </view>

      <!-- 对话消息 -->
      <view v-for="(message, index) in currentMessages" :key="index" class="message-item">
        <!-- 用户消息 -->
        <view v-if="message.type === 'user'" class="user-message">
          <view class="message-bubble user-bubble">
            <text class="message-text">{{ message.content }}</text>
          </view>
          <view class="user-avatar">
            <text class="avatar-text">我</text>
          </view>
        </view>
        
        <!-- AI消息 -->
        <view v-else class="ai-message">
          <view class="ai-avatar">
            <view class="avatar-bg">
              <image src="/static/EchoNote.png" class="avatar-logo" mode="aspectFit"></image>
            </view>
          </view>
          <view class="message-content">
            <view class="message-bubble ai-bubble">
              <text class="message-text">{{ message.content }}</text>
            </view>

          </view>
        </view>
      </view>
      
      <!-- 正在输入 -->
      <view class="ai-message" v-if="isTyping">
        <view class="ai-avatar">
          <view class="avatar-bg">
            <image src="/static/EchoNote.png" class="avatar-logo" mode="aspectFit"></image>
          </view>
        </view>
        <view class="message-bubble ai-bubble typing-bubble">
          <view class="typing-dots">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
          </view>
        </view>
      </view>
      
      <!-- 底部占位元素，确保最后消息不被输入框遮挡 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 操作确认按钮 -->
    <view class="action-buttons" v-if="showActionButtons">
      <view class="action-buttons-content">
        <button class="action-btn cancel-btn" @click="handleUserConfirmation(false)">
          取消
        </button>
        <button class="action-btn confirm-btn" @click="handleUserConfirmation(true)">
          确认
        </button>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="input-section">
      <view class="input-container">
        <view class="input-wrapper">
          <textarea 
            v-model="inputText"
            placeholder="输入您的问题..."
            class="message-input"
            :auto-height="true"
            :maxlength="2000"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </view>
        <button 
          class="send-btn" 
          @click="sendMessage"
          :disabled="!inputText.trim() || isTyping"
          :class="{ 'active': inputText.trim() && !isTyping }"
        >
          <uni-icons 
            type="paperplane-filled" 
            size="20" 
            :color="inputText.trim() && !isTyping ? '#ffffff' : '#c7c7cc'"
          />
        </button>
      </view>
    </view>

    
    </view> <!-- 结束 content-area -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { sendAIMessageWithContext, checkAIService, type Message } from '@/utils/aiService'
import aiCommandProcessor, { type AIStructuredResponse, type ExecutionResult } from '@/utils/aiCommandProcessor'
import { 
  createNote, 
  updateNote, 
  deleteNote, 
  getAllNotes, 
  searchNotes, 
  getNoteSummary,
  getFullNotesContext,
  createTask,
  createMultipleTasks,
  completeTask, 
  deleteTask, 
  getTaskSummary,
  getFullTasksContext,
  parseTasksFromNote 
} from '@/utils/dataService'
import dataService from '@/utils/dataService'

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

// 状态管理
const chatHistory = ref<ChatSession[]>([])
const currentChatIndex = ref(-1)
const inputText = ref('')
const isTyping = ref(false)
const scrollTop = ref(0)
const showHistoryPanel = ref(false)
const aiServiceStatus = ref<'checking' | 'connected' | 'error'>('checking')

// 命令处理相关状态
const pendingCommands = ref<ExecutionResult[]>([])
const showActionButtons = ref(false)

// 系统信息
const statusBarHeight = ref(0)
const navBarHeight = ref(44)

// 当前聊天的消息
const currentMessages = computed(() => {
  if (currentChatIndex.value >= 0 && chatHistory.value[currentChatIndex.value]) {
    return chatHistory.value[currentChatIndex.value].messages
  }
  return []
})

// 显示历史记录
const showHistory = () => {
  showHistoryPanel.value = true
}

// 隐藏历史记录
const hideHistory = () => {
  showHistoryPanel.value = false
}

// 开始新对话
const startNewChat = () => {
  const newChat: ChatSession = {
    id: Date.now().toString(),
    title: '新对话',
    messages: [],
    timestamp: Date.now()
  }
  chatHistory.value.unshift(newChat)
  currentChatIndex.value = 0
  hideHistory()
}

// 切换到指定对话
const switchToChat = (index: number) => {
  currentChatIndex.value = index
  hideHistory()
  scrollToBottom()
}

// 显示删除确认对话框
const showDeleteConfirm = (index: number) => {
  const chat = chatHistory.value[index]
  uni.showModal({
    title: '删除对话',
    content: `确定要删除对话"${chat.title}"吗？`,
    confirmText: '删除',
    confirmColor: '#ff4757',
    success: (res) => {
      if (res.confirm) {
        deleteChat(index)
      }
    }
  })
}

// 删除指定对话
const deleteChat = (index: number) => {
  // 如果删除的是当前对话
  if (currentChatIndex.value === index) {
    // 如果还有其他对话，切换到第一个
    if (chatHistory.value.length > 1) {
      currentChatIndex.value = index === 0 ? 0 : index - 1
    } else {
      // 如果没有其他对话了，重置当前对话索引
      currentChatIndex.value = -1
    }
  } else if (currentChatIndex.value > index) {
    // 如果删除的对话在当前对话之前，需要调整当前对话索引
    currentChatIndex.value -= 1
  }
  
  // 删除对话
  chatHistory.value.splice(index, 1)
  
  // 保存到本地存储
  saveChatHistory()
  
  // 显示删除成功提示
  uni.showToast({
    title: '对话已删除',
    icon: 'success',
    duration: 1500
  })
}

// 构建用户数据上下文
const buildUserDataContext = async () => {
  try {
    console.log('开始获取用户所有笔记内容...')
    
    // 直接获取所有笔记
    const allNotes = await getAllNotes()
    console.log('获取到的笔记数量:', allNotes.length)
    console.log('笔记内容:', allNotes)
    
    const { pending: pendingTasks, completed: completedTasks } = await dataService.getAllTasks()
    console.log('获取到的待办任务数量:', pendingTasks.length)
    console.log('获取到的已完成任务数量:', completedTasks.length)
    console.log('待办任务:', pendingTasks)
    console.log('已完成任务:', completedTasks)
    
    // 构建简单直接的笔记内容
    let notesContent = ''
    if (allNotes.length > 0) {
      notesContent = '我的笔记内容：\n\n'
      allNotes.forEach((note, index) => {
        const priority = note.isPinned ? '[置顶]' : note.isFavorite ? '[收藏]' : ''
        notesContent += `${index + 1}. ${priority}${note.title}\n${note.content}\n\n`
      })
    } else {
      notesContent = '我还没有任何笔记。\n\n'
    }
    
    // 构建任务内容
    let tasksContent = ''
    if (pendingTasks.length > 0 || completedTasks.length > 0) {
      tasksContent = '我的任务情况：\n\n'
      
      if (pendingTasks.length > 0) {
        tasksContent += '待办任务：\n'
        pendingTasks.forEach((task: any, index: number) => {
          tasksContent += `${index + 1}. ${task.text}\n`
        })
        tasksContent += '\n'
      }
      
      if (completedTasks.length > 0) {
        tasksContent += '已完成任务：\n'
        completedTasks.slice(0, 5).forEach((task: any, index: number) => {
          tasksContent += `${index + 1}. ${task.text}\n`
        })
        tasksContent += '\n'
      }
    } else {
      tasksContent = '我还没有任何任务。\n\n'
    }
    
    const fullContext = notesContent + tasksContent
    
    console.log('构建的完整上下文:')
    console.log(fullContext)
    console.log('上下文长度:', fullContext.length)
    
    return fullContext
  } catch (error) {
    console.error('获取用户数据失败:', error)
    return ''
  }
}

// 处理用户确认操作
const handleUserConfirmation = async (confirmed: boolean) => {
  showActionButtons.value = false
  
  if (!confirmed) {
    return
  }
  
  // 在新架构中，确认操作由AI命令处理器处理
  // 这里可以根据需要扩展
}

// 创建测试数据
const createTestData = async () => {
  try {
    uni.showLoading({
      title: '创建测试数据...'
    })
    
    // 创建测试笔记
    await createNote('学习计划', '本周要完成JavaScript基础学习，包括变量、函数、对象等概念。', { isPinned: true })
    await createNote('项目笔记', 'EchoNote项目开发进度：已完成基础框架，正在开发AI功能集成。', { isFavorite: true })
    await createNote('读书心得', '今天读了《深入理解计算机系统》第一章，了解了计算机系统的基本概念。')
    
    // 创建测试任务
    await createTask('准备期末考试')
    await createTask('完成AI功能开发')
    await createTask('提交作业')
    
    uni.hideLoading()
    
    uni.showToast({
      title: '测试数据创建成功',
      icon: 'success'
    })
    
    console.log('测试数据创建完成')
    
  } catch (error) {
    uni.hideLoading()
    console.error('创建测试数据失败:', error)
    
    uni.showToast({
      title: '创建失败',
      icon: 'error'
    })
  }
}

// 快捷发送
const quickSend = (text: string) => {
  inputText.value = text
  sendMessage()
}

// 格式化历史记录时间
const formatHistoryTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

// 输入焦点事件
const onInputFocus = () => {
  scrollToBottom()
}

const onInputBlur = () => {
  // 失焦处理
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    // 使用更大的数值确保能滚动到最底部，适应新的布局
    scrollTop.value = Math.max(999999, scrollTop.value + 1000)
  })
}

// 生成对话标题
const generateChatTitle = (firstMessage: string) => {
  if (firstMessage.length > 15) {
    return firstMessage.substring(0, 15) + '...'
  }
  return firstMessage
}

// 发送消息
const sendMessage = async () => {
  if (!inputText.value.trim() || isTyping.value) return
  
  // 如果没有当前对话，创建新对话
  if (currentChatIndex.value < 0) {
    startNewChat()
  }
  
  const userMessage: Message = {
    type: 'user',
    content: inputText.value.trim(),
    timestamp: Date.now()
  }
  
  // 添加用户消息
  chatHistory.value[currentChatIndex.value].messages.push(userMessage)
  
  // 如果是第一条消息，更新对话标题
  if (chatHistory.value[currentChatIndex.value].messages.length === 1) {
    chatHistory.value[currentChatIndex.value].title = generateChatTitle(userMessage.content)
  }
  
  const userInput = inputText.value.trim()
  inputText.value = ''
  
  scrollToBottom()
  
  // 显示正在输入
  isTyping.value = true
  
  try {
    // 获取当前对话历史
    const currentHistory = chatHistory.value[currentChatIndex.value].messages
    
    // 构建用户数据上下文
    console.log('开始构建用户数据上下文...')
    const userDataContext = await buildUserDataContext()
    console.log('用户数据上下文构建完成，内容:')
    console.log(userDataContext)
    console.log('上下文长度:', userDataContext.length)
    
    // 发送到AI API（带上下文）
    console.log('发送消息到AI服务:', userInput)
    console.log('发送的完整上下文:', userDataContext)
    const aiResponse = await sendAIMessageWithContext(userInput, currentHistory, userDataContext)
    console.log('收到AI原始响应:', aiResponse)
    
    // 更新连接状态为成功
    aiServiceStatus.value = 'connected'
    
    // 解析AI返回的结构化响应
    console.log('开始解析AI响应...')
    const structuredResponse = aiCommandProcessor.parseAIResponse(aiResponse)
    console.log('AI响应解析完成:', structuredResponse)
    
    // 添加AI回复消息
    const aiMessage: Message = {
      type: 'ai',
      content: structuredResponse.reply,
      timestamp: Date.now()
    }
    
    chatHistory.value[currentChatIndex.value].messages.push(aiMessage)
    isTyping.value = false
    
    // 执行AI返回的命令
    console.log('检查AI命令:', structuredResponse.commands)
    if (structuredResponse.commands.length > 0) {
      console.log('开始执行', structuredResponse.commands.length, '个命令')
      const executionResults = await aiCommandProcessor.executeCommands(structuredResponse.commands)
      console.log('命令执行结果:', executionResults)
      
      // 将执行结果添加为新的AI消息
      const resultMessages = executionResults
        .filter(result => result.message)
        .map(result => result.message)
        .join('\n')
      
      if (resultMessages) {
        console.log('添加执行结果消息:', resultMessages)
        const resultMessage: Message = {
          type: 'ai',
          content: resultMessages,
          timestamp: Date.now()
        }
        chatHistory.value[currentChatIndex.value].messages.push(resultMessage)
      }
    } else {
      console.log('没有找到可执行的命令')
    }
    
    scrollToBottom()
    
    // 保存到本地存储
    saveChatHistory()
  } catch (error) {
    console.error('AI回复失败:', error)
    
    // 更新连接状态为错误
    aiServiceStatus.value = 'error'
    
    // 显示错误信息
    const errorMessage: Message = {
      type: 'ai',
      content: '抱歉，我现在无法回复您的消息。请稍后再试或检查网络连接。',
      timestamp: Date.now()
    }
    
    chatHistory.value[currentChatIndex.value].messages.push(errorMessage)
    isTyping.value = false
    scrollToBottom()
    
    // 显示错误提示
    uni.showToast({
      title: 'AI服务暂时不可用',
      icon: 'none',
      duration: 2000
    })
    
    // 保存到本地存储
    saveChatHistory()
  }
}

// 保存聊天记录
const saveChatHistory = () => {
  try {
    uni.setStorageSync('ai_chat_history', JSON.stringify(chatHistory.value))
  } catch (e) {
    console.error('保存聊天记录失败:', e)
  }
}

// 加载聊天记录
const loadChatHistory = () => {
  try {
    const saved = uni.getStorageSync('ai_chat_history')
    if (saved) {
      chatHistory.value = JSON.parse(saved)
      if (chatHistory.value.length > 0) {
        currentChatIndex.value = 0
      }
    }
  } catch (e) {
    console.error('加载聊天记录失败:', e)
  }
}

// 检查AI服务状态
const checkServiceStatus = async () => {
  try {
    aiServiceStatus.value = 'checking'
    const isConnected = await checkAIService()
    aiServiceStatus.value = isConnected ? 'connected' : 'error'
  } catch (error) {
    console.error('检查AI服务状态失败:', error)
    aiServiceStatus.value = 'error'
  }
}

// 页面初始化
onMounted(async () => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
  } catch (e) {
    navBarHeight.value = 44
  }
  
  // 加载历史记录
  loadChatHistory()
  
  // 检查AI服务状态
  await checkServiceStatus()
})
</script>

<style scoped>
.ai-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f9fa;
  position: relative;
}

/* 固定头部 */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998; /* 确保在消息内容之上，但在输入框和侧边栏之下 */
  background: #ffffff;
  border-bottom: 1rpx solid #e9ecef;
}

.status-bar {
  background: transparent;
}

.nav-bar {
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
}

.nav-content {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.history-btn {
  width: 72rpx;
  height: 72rpx;
  background: #f8f9fa;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.history-btn:active {
  background: #e9ecef;
  transform: scale(0.95);
}

.nav-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 16rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #212529;
  line-height: 1.2;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.checking {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-dot.connected {
  background: #28a745;
}

.status-dot.error {
  background: #dc3545;
}

.status-text {
  font-size: 20rpx;
  color: #6c757d;
  line-height: 1.2;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.nav-subtitle {
  font-size: 22rpx;
  color: #6c757d;
  line-height: 1.2;
}

.nav-right {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

/* 历史记录侧边栏 */
.history-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001; /* 确保在输入框之上 */
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.history-sidebar.show {
  opacity: 1;
  visibility: visible;
}

.history-content {
  width: 560rpx;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 2rpx 0 16rpx rgba(0, 0, 0, 0.1);
  padding-top: env(safe-area-inset-top);
  border-top-right-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60rpx 32rpx 32rpx 32rpx;
  border-bottom: 1rpx solid #e9ecef;
  flex-shrink: 0;
  background: #ffffff;
}

.history-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #212529;
}

.close-btn {
  width: 56rpx;
  height: 56rpx;
  background: #f8f9fa;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:active {
  background: #e9ecef;
}

.new-chat-section {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #e9ecef;
  flex-shrink: 0;
}

.new-chat-btn {
  width: 100%;
  height: 80rpx;
  background: #007AFF;
  border: none;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  transition: all 0.2s ease;
}

.new-chat-btn:active {
  background: #0056b3;
  transform: scale(0.98);
}

.new-chat-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

.history-list {
  flex: 1;
  padding: 16rpx 0;
  height: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.history-item:active {
  background: #f8f9fa;
}

.history-item.active {
  background: #e3f2fd;
}

/* 长按删除提示样式 */
.history-item::after {
  content: "长按删除";
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #adb5bd;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.history-item:hover::after {
  opacity: 1;
}

.history-icon {
  width: 48rpx;
  height: 48rpx;
  background: #f8f9fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-text {
  font-size: 28rpx;
  color: #212529;
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 22rpx;
  color: #6c757d;
}

.messages-container {
  flex: 1;
  padding: 32rpx;
  padding-bottom: 20rpx; /* 减少底部padding，使用占位元素代替 */
  height: 0; /* 确保flex子元素能正确计算高度 */
  position: relative;
  z-index: 1; /* 确保消息容器在输入框下层 */
}

/* 底部占位元素，确保内容不被输入框遮挡 */
.bottom-spacer {
  height: calc(110rpx + env(safe-area-inset-bottom)); /* 减少占位高度，适应新的输入框位置 */
  width: 100%;
}

.welcome-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.welcome-content {
  text-align: center;
  max-width: 600rpx;
  width: 100%;
}

.welcome-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 30rpx;
}

.echo-logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 30rpx;
}

.welcome-info {
  text-align: center;
  margin-bottom: 60rpx;
}

.welcome-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 30rpx;
  display: block;
}

.welcome-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  white-space: pre-line;
}

.suggestions-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
  width: 100%;
}

.suggestion-btn {
  background: #ffffff;
  border: 2rpx solid #e9ecef;
  border-radius: 32rpx;
  padding: 24rpx 32rpx;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 480rpx;
}

.suggestion-btn:active {
  background: #f8f9fa;
  border-color: #007AFF;
  transform: scale(0.98);
}

.suggestion-text {
  font-size: 28rpx;
  color: #495057;
  text-align: center;
}

.message-item {
  margin-bottom: 28rpx;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 16rpx;
  padding-right: 55rpx;
}

.ai-message {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding-right: 80rpx; /* 增加右边距，让AI回复框向左移动 */
}

.ai-avatar {
  flex-shrink: 0;
}

.avatar-bg {
  width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx;
}

.avatar-logo {
  width: 40rpx;
  height: 40rpx;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  background: #6c757d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.message-bubble {
  max-width: 75%;
  padding: 24rpx 32rpx;
  border-radius: 32rpx;
  position: relative;
}

.ai-message .message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 80%; /* AI回复框稍微宽一些，配合右边距调整 */
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}

.user-bubble {
  background: #007AFF;
  color: #ffffff;
  border-bottom-right-radius: 8rpx;
}

.ai-bubble {
  background: #ffffff;
  color: #212529;
  border: 1rpx solid #e9ecef;
  border-bottom-left-radius: 8rpx;
}

.message-text {
  font-size: 30rpx;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-bubble .message-text {
  color: #ffffff;
}

.typing-bubble {
  padding: 32rpx !important;
}

.typing-dots {
  display: flex;
  gap: 8rpx;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  background: #6c757d;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8rpx);
    opacity: 1;
  }
}

.input-section {
  position: fixed;
  bottom: 0; /* 固定在最底部 */
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: none; /* 移除边框，更简洁 */
  padding: 12rpx 20rpx 6rpx 20rpx; /* 减少底部内边距，贴近底部 */
  padding-bottom: max(6rpx, env(safe-area-inset-bottom)); /* 最小化底部空白 */
  z-index: 999; /* 提高层级确保在最上层 */
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06); /* 添加向上的阴影 */
}

.input-container {
  display: flex;
  align-items: center; /* 改为center对齐，减少高度 */
  gap: 12rpx; /* 减少间距 */
}

.input-wrapper {
  flex: 1;
  background: #f8f9fa;
  border-radius: 50rpx; /* ChatGPT风格圆角 */
  padding: 18rpx 28rpx; /* 适应圆角设计 */
  display: flex;
  align-items: center;
  min-height: 76rpx; /* 合适的高度 */
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06); /* 轻微阴影 */
}

.input-wrapper:focus-within {
  border-color: #007AFF;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.15); /* 聚焦时增强阴影 */
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 28rpx;
  color: #212529;
  line-height: 1.4;
  min-height: 44rpx; /* 适应圆角设计 */
  max-height: 140rpx; /* 增加最大高度 */
  resize: none;
}

.message-input::placeholder {
  color: #6c757d;
}

.send-btn {
  width: 76rpx; /* 匹配输入框高度 */
  height: 76rpx;
  background: #e9ecef; /* 默认灰色 */
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08); /* 轻微阴影 */
}

.send-btn.active {
  background: #007AFF;
  box-shadow: 0 3rpx 10rpx rgba(0, 122, 255, 0.25); /* 激活状态增强阴影 */
}

.send-btn:active {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
}

/* 操作确认按钮 */
.action-buttons {
  position: fixed;
  bottom: 100rpx; /* 在输入框上方 */
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10rpx);
  padding: 20rpx;
  z-index: 998;
  display: flex;
  justify-content: center;
}

.action-buttons-content {
  display: flex;
  gap: 24rpx;
  background: #ffffff;
  padding: 12rpx;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.action-btn {
  padding: 16rpx 40rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 120rpx;
}

.cancel-btn {
  background: #f8f9fa;
  color: #6c757d;
}

.cancel-btn:active {
  background: #e9ecef;
  transform: scale(0.95);
}

.confirm-btn {
  background: #007AFF;
  color: #ffffff;
}

.confirm-btn:active {
  background: #0056b3;
  transform: scale(0.95);
}


</style> 