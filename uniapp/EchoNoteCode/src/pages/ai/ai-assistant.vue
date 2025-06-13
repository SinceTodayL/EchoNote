<template>
  <view class="ai-container">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ height: navBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">🤖 AI 智能助手</text>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <view class="main-content">
      <view class="welcome-section">
        <view class="ai-avatar-large">
          <text class="ai-icon">🤖</text>
        </view>
        <text class="welcome-title">EchoNote AI 助手</text>
        <text class="welcome-subtitle">我可以帮您整理笔记、回答问题、提供建议</text>
        
        <!-- 快捷功能按钮 -->
        <view class="quick-actions">
          <view class="action-button" @click="quickAction('summarize')">
            <text class="action-icon">📝</text>
            <text class="action-text">总结笔记</text>
          </view>
          <view class="action-button" @click="quickAction('translate')">
            <text class="action-icon">🌐</text>
            <text class="action-text">翻译文本</text>
          </view>
          <view class="action-button" @click="quickAction('brainstorm')">
            <text class="action-icon">💡</text>
            <text class="action-text">头脑风暴</text>
          </view>
          <view class="action-button" @click="quickAction('grammar')">
            <text class="action-icon">✅</text>
            <text class="action-text">语法检查</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view v-if="messages.length > 0" class="messages-container">
        <view v-for="(message, index) in messages" :key="index" class="message-item">
          <view v-if="message.type === 'user'" class="user-message">
            <text class="message-text">{{ message.content }}</text>
          </view>
          <view v-else class="ai-message">
            <text class="message-text">{{ message.content }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="input-section">
      <view class="input-container">
        <input 
          v-model="inputText"
          placeholder="输入您的问题或需求..."
          class="message-input"
          @confirm="sendMessage"
        />
        <view class="send-btn" @click="sendMessage">
          <text>发送</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: number
}

// 状态管理
const messages = ref<Message[]>([])
const inputText = ref('')

// 系统信息
const statusBarHeight = ref(0)
const navBarHeight = ref(44)

// 快捷操作
const quickAction = (action: string) => {
  const actionTexts = {
    summarize: '请帮我总结一下我的笔记内容',
    translate: '请帮我翻译这段文字',
    brainstorm: '我需要一些创意想法，请帮我头脑风暴',
    grammar: '请帮我检查这段文字的语法'
  }
  
  inputText.value = actionTexts[action as keyof typeof actionTexts] || ''
  sendMessage()
}

// 发送消息
const sendMessage = () => {
  if (!inputText.value.trim()) return
  
  const userMessage: Message = {
    type: 'user',
    content: inputText.value.trim(),
    timestamp: Date.now()
  }
  
  messages.value.push(userMessage)
  const userInput = inputText.value.trim()
  inputText.value = ''
  
  // 模拟AI回复
  setTimeout(() => {
    const aiResponse = generateAIResponse(userInput)
    const aiMessage: Message = {
      type: 'ai',
      content: aiResponse,
      timestamp: Date.now()
    }
    messages.value.push(aiMessage)
  }, 1000)
}

// 生成AI回复（模拟）
const generateAIResponse = (input: string): string => {
  if (input.includes('总结') || input.includes('笔记')) {
    return '我可以帮您总结笔记内容。请将需要总结的笔记内容发送给我，我会为您提取关键信息和要点。'
  } else if (input.includes('翻译')) {
    return '我可以帮您翻译多种语言。请告诉我您需要翻译的内容和目标语言。'
  } else if (input.includes('头脑风暴') || input.includes('创意')) {
    return '头脑风暴是个好主意！请告诉我您的主题或目标，我会为您提供多个创意方向和具体建议。'
  } else if (input.includes('语法') || input.includes('检查')) {
    return '我可以帮您检查语法和表达。请发送需要检查的文字内容，我会指出问题并提供改进建议。'
  }
  
  return '我理解您的需求。基于您的描述，我建议您可以尝试以下几个方法...'
}

// 页面初始化
onMounted(() => {
  // 获取系统信息
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
  } catch (e) {
    navBarHeight.value = 44
  }
})
</script>

<style scoped>
.ai-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.status-bar {
  background: transparent;
}

.nav-bar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.nav-content {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.ai-avatar-large {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.ai-icon {
  font-size: 40px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 32px;
  line-height: 1.5;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 300px;
}

.action-button {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 20px;
}

.action-text {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.messages-container {
  margin-top: 20px;
}

.message-item {
  margin-bottom: 16px;
}

.user-message {
  display: flex;
  justify-content: flex-end;
}

.ai-message {
  display: flex;
  justify-content: flex-start;
}

.message-text {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  background: rgba(255, 255, 255, 0.9);
  color: #1F2937;
}

.user-message .message-text {
  background: #3B82F6;
  color: #FFFFFF;
}

.input-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1F2937;
  padding: 8px 0;
}

.send-btn {
  background: #3B82F6;
  color: #FFFFFF;
  padding: 8px 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #2563EB;
}
</style> 