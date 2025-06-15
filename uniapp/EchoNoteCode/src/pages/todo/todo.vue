<template>
  <view class="todo-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <text class="navbar-title">待办清单</text>
      <button class="refresh-btn" @click="refreshTasks">
        <uni-icons type="refresh" size="20" color="#007aff"></uni-icons>
      </button>
    </view>
    <!-- 添加任务栏 -->
    <view class="add-task-section">
      <view class="add-task-container">
        <input 
          type="text" 
          v-model="newTask"
          placeholder="今天要做什么？" 
          class="task-input"
          @keypress.enter="addTask"
        />
        <view class="completed-badge" @click="showCompletedTasks">
          <text class="completed-count">{{ completedTasks.length }}</text>
          <text class="completed-label">已完成</text>
        </view>
        <button class="add-btn" @click="addTask" :disabled="!newTask.trim()">
          <uni-icons type="plus" size="20" color="#ffffff"></uni-icons>
        </button>
      </view>
    </view>

    <!-- 待办任务列表 -->
    <scroll-view scroll-y="true" class="todo-list" v-if="!showCompleted">
      <!-- 空状态 -->
      <view class="empty-state" v-if="tasks.length === 0">
        <uni-icons type="checkmarkempty" size="80" color="#e0e0e0"></uni-icons>
        <text class="empty-text">今天还没有任务</text>
        <text class="empty-subtitle">添加一个新任务开始您的一天</text>
      </view>

      <!-- 按日期分组显示 -->
      <view 
        v-for="group in groupedTasks" 
        :key="group.date" 
        class="date-group"
      >
        <view class="date-header">
          <text class="date-label">{{ group.dateLabel }}</text>
          <text class="task-count">{{ group.tasks.length }} 项任务</text>
        </view>
        <view 
          v-for="task in group.tasks" 
          :key="task.id" 
          class="todo-item"
        >
          <view class="task-main" @click="toggleTask(task.id)">
            <view class="checkbox-container">
              <view class="custom-checkbox" :class="{ 'checked': false }">
                <uni-icons v-if="false" type="checkmarkempty" size="16" color="#ffffff"></uni-icons>
              </view>
            </view>
            <view class="task-info">
              <text class="task-text">{{ task.text }}</text>
              <text class="task-time">{{ formatTime(task.createTime) }}</text>
            </view>
          </view>
          <view class="task-actions" @click.stop="deleteTask(task.id)">
            <view class="delete-btn">
              <uni-icons type="trash" size="18" color="#ff4757"></uni-icons>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 已完成任务页面 -->
    <view class="completed-page" v-if="showCompleted">
      <!-- 已完成页面头部 -->
      <view class="completed-header">
        <view class="header-nav">
          <button class="back-btn" @click="showCompleted = false">
            <uni-icons type="left" size="18" color="#333"></uni-icons>
            <text>返回</text>
          </button>
          <text class="page-title">已完成</text>
          <view class="nav-right">
            <button class="clear-all-btn" @click="clearAllCompleted" v-if="completedTasks.length > 0">
              <text>清空</text>
            </button>
          </view>
        </view>
        <view class="completed-stats" v-if="completedTasks.length > 0">
          <text class="stats-text">共完成 {{ completedTasks.length }} 项任务</text>
        </view>
      </view>

      <!-- 已完成任务列表 -->
      <scroll-view scroll-y="true" class="completed-list">
        <!-- 空状态 -->
        <view class="empty-state" v-if="completedTasks.length === 0">
          <uni-icons type="star" size="80" color="#e0e0e0"></uni-icons>
          <text class="empty-text">还没有完成的任务</text>
          <text class="empty-subtitle">完成一些任务来查看成就吧</text>
        </view>

        <!-- 按日期分组显示 -->
        <view 
          v-for="group in groupedCompletedTasks" 
          :key="group.date" 
          class="date-group"
        >
          <view class="date-header">
            <text class="date-label">{{ group.dateLabel }}</text>
            <text class="task-count">{{ group.tasks.length }} 项任务</text>
          </view>
          <view 
            v-for="task in group.tasks" 
            :key="task.id" 
            class="todo-item completed-item"
          >
            <view class="task-main">
              <view class="checkbox-container">
                <view class="custom-checkbox checked">
                  <uni-icons type="checkmarkempty" size="16" color="#ffffff"></uni-icons>
                </view>
              </view>
              <view class="task-info">
                <text class="task-text">{{ task.text }}</text>
                <text class="task-time">完成于 {{ formatTime(task.completedTime || 0) }}</text>
              </view>
            </view>
            <view class="task-actions" @click.stop="deleteCompletedTask(task.id)">
              <view class="delete-btn">
                <uni-icons type="trash" size="18" color="#ff4757"></uni-icons>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部统计 -->
    <view class="todo-stats" v-if="!showCompleted">
      <text>剩余 {{ remainingTasks }} 项任务</text>
      <text>已完成 {{ completedTasks.length }} 项</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Task {
  id: number
  text: string
  completed: boolean
  createTime: number
  completedTime?: number
}

const newTask = ref('')
const tasks = ref<Task[]>([])
const completedTasks = ref<Task[]>([])
const showCompleted = ref(false)

// 数据持久化
const saveTasks = () => {
  uni.setStorageSync('todo_tasks', tasks.value)
  uni.setStorageSync('todo_completed_tasks', completedTasks.value)
  console.log('任务已保存到本地存储')
}

const loadTasks = () => {
  try {
    console.log('Todo页面开始加载任务...')
    const savedTasks = uni.getStorageSync('todo_tasks')
    const savedCompletedTasks = uni.getStorageSync('todo_completed_tasks')
    
    console.log('从存储中读取的待办任务:', savedTasks)
    console.log('从存储中读取的已完成任务:', savedCompletedTasks)
    
    if (savedTasks && Array.isArray(savedTasks)) {
      tasks.value = savedTasks
      console.log('设置待办任务:', tasks.value)
    }
    if (savedCompletedTasks && Array.isArray(savedCompletedTasks)) {
      completedTasks.value = savedCompletedTasks
      console.log('设置已完成任务:', completedTasks.value)
    }
    
    console.log('Todo页面任务加载完成，当前任务数量:', tasks.value.length)
  } catch (error) {
    console.error('加载任务失败:', error)
  }
}

// 定期检查存储变化
const checkStorageChanges = () => {
  const currentStoredTasks = uni.getStorageSync('todo_tasks') || []
  if (JSON.stringify(currentStoredTasks) !== JSON.stringify(tasks.value)) {
    console.log('检测到存储数据变化，重新加载...')
    loadTasks()
  }
}

// 启动定期检查
let storageCheckInterval: any = null
const startStorageCheck = () => {
  if (storageCheckInterval) {
    clearInterval(storageCheckInterval)
  }
  storageCheckInterval = setInterval(checkStorageChanges, 2000) // 每2秒检查一次
}

const stopStorageCheck = () => {
  if (storageCheckInterval) {
    clearInterval(storageCheckInterval)
    storageCheckInterval = null
  }
}

// 添加新任务
const addTask = () => {
  if (!newTask.value.trim()) return
  const task: Task = {
    id: Date.now(),
    text: newTask.value.trim(),
    completed: false,
    createTime: Date.now()
  }
  tasks.value.push(task)
  newTask.value = ''
  saveTasks()
}

// 切换任务状态
const toggleTask = (id: number) => {
  const task = tasks.value.find(t => t.id === id)
  if (task) {
    // 将任务移动到已完成列表
    task.completed = true
    task.completedTime = Date.now()
    completedTasks.value.push(task)
    // 从待办列表中移除
    tasks.value = tasks.value.filter(t => t.id !== id)
    saveTasks()
  }
}

// 删除任务
const deleteTask = (id: number) => {
  tasks.value = tasks.value.filter(t => t.id !== id)
  saveTasks()
}

// 删除已完成任务
const deleteCompletedTask = (id: number) => {
  completedTasks.value = completedTasks.value.filter(t => t.id !== id)
  saveTasks()
}

// 显示已完成任务
const showCompletedTasks = () => {
  showCompleted.value = true
}

// 清空所有已完成任务
const clearAllCompleted = () => {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有已完成的任务吗？',
    success: (res) => {
      if (res.confirm) {
        completedTasks.value = []
        saveTasks()
        uni.showToast({
          title: '已清空',
          icon: 'success'
        })
      }
    }
  })
}

// 手动刷新任务数据
const refreshTasks = () => {
  console.log('手动刷新任务数据...')
  loadTasks()
  uni.showToast({
    title: '已刷新',
    icon: 'success',
    duration: 1000
  })
}



// 页面初始化
onMounted(() => {
  console.log('Todo页面mounted，开始加载数据')
  loadTasks()
  startStorageCheck()
})

// 页面显示时也重新加载数据
const onShow = () => {
  console.log('Todo页面onShow，重新加载数据')
  loadTasks()
  startStorageCheck()
}

// 页面隐藏时停止检查
const onHide = () => {
  console.log('Todo页面onHide，停止存储检查')
  stopStorageCheck()
}

// 页面卸载时清理
const onPageUnmounted = () => {
  console.log('Todo页面onUnmounted，清理资源')
  stopStorageCheck()
}

// Vue组件卸载钩子
onUnmounted(() => {
  console.log('Vue组件卸载，停止存储检查')
  stopStorageCheck()
})

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 格式化日期标签
const formatDateLabel = (timestamp: number) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit' 
    })
  }
}

// 按日期分组待办任务
const groupedTasks = computed(() => {
  const groups: { [key: string]: Task[] } = {}
  
  tasks.value.forEach(task => {
    const dateKey = new Date(task.createTime).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(task)
  })
  
  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(dateKey => ({
      date: dateKey,
      dateLabel: formatDateLabel(new Date(dateKey).getTime()),
      tasks: groups[dateKey].sort((a, b) => b.createTime - a.createTime)
    }))
})

// 按日期分组已完成任务
const groupedCompletedTasks = computed(() => {
  const groups: { [key: string]: Task[] } = {}
  
  completedTasks.value.forEach(task => {
    if (task.completedTime) {
      const dateKey = new Date(task.completedTime).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(task)
    }
  })
  
  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(dateKey => ({
      date: dateKey,
      dateLabel: formatDateLabel(new Date(dateKey).getTime()),
      tasks: groups[dateKey].sort((a, b) => (b.completedTime || 0) - (a.completedTime || 0))
    }))
})

// 计算剩余任务数量
const remainingTasks = computed(() => {
  return tasks.value.length
})

// 导出生命周期方法供uniapp使用
defineExpose({
  onShow,
  onHide,
  onUnmounted: onPageUnmounted
})
</script>

<style>
.todo-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f9fa;
}

/* 自定义导航栏 */
.custom-navbar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 88rpx;
  background-color: #ffffff;
  padding-top: 64rpx;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.refresh-btn {
  position: absolute;
  right: 24rpx;
  width: 64rpx;
  height: 64rpx;
  background: transparent;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:active {
  background: #f0f0f0;
  transform: scale(0.9) rotate(180deg);
}



.completed-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 12rpx;
  background-color: #f8f9fa;
  border-radius: 10rpx;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12rpx;
}

.completed-badge:active {
  background-color: #e9ecef;
  transform: scale(0.96);
}

.completed-count {
  font-size: 24rpx;
  font-weight: 600;
  color: #007aff;
}

.completed-label {
  font-size: 20rpx;
  color: #6c757d;
  margin-top: 2rpx;
}

/* 添加任务区域 */
.add-task-section {
  padding: 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.add-task-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx;
  background-color: #f8f9fa;
  border-radius: 16rpx;
}

.task-input {
  flex: 1;
  padding: 16rpx 20rpx;
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 28rpx;
  color: #1a1a1a;
}

.task-input::placeholder {
  color: #6c757d;
}

.add-btn {
  width: 72rpx;
  height: 72rpx;
  background-color: #007aff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all 0.2s ease;
}

.add-btn:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

.add-btn:active:not(:disabled) {
  transform: scale(0.9);
  background-color: #0056b3;
}

/* 任务列表 */
.todo-list {
  flex: 1;
  padding: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 32rpx;
  color: #6c757d;
  margin-top: 24rpx;
  font-weight: 500;
}

.empty-subtitle {
  font-size: 24rpx;
  color: #adb5bd;
  margin-top: 12rpx;
  line-height: 1.4;
}

.date-group {
  margin-bottom: 40rpx;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
}

.date-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.task-count {
  font-size: 22rpx;
  color: #6c757d;
}

.todo-item {
  background-color: #ffffff;
  margin-bottom: 12rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.todo-item:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.task-main {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 24rpx;
  cursor: pointer;
}

.checkbox-container {
  margin-right: 20rpx;
}

.custom-checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #dee2e6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.custom-checkbox.checked {
  background-color: #28a745;
  border-color: #28a745;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.task-text {
  font-size: 28rpx;
  color: #1a1a1a;
  line-height: 1.4;
  font-weight: 500;
}

.task-time {
  font-size: 22rpx;
  color: #6c757d;
}

.completed-item .task-text {
  text-decoration: line-through;
  color: #6c757d;
}

.task-actions {
  padding: 24rpx 20rpx;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.delete-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #fff5f5;
  transition: all 0.2s ease;
}

.delete-btn:active {
  background-color: #fed7d7;
  transform: scale(0.9);
}

/* 已完成页面 */
.completed-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.completed-header {
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  position: relative;
  min-height: 80rpx; /* 确保足够高度 */
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background-color: transparent;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  transition: all 0.2s ease;
  flex-shrink: 0; /* 防止被压缩 */
}

.back-btn:active {
  background-color: #f8f9fa;
  transform: scale(0.96);
}

.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  text-align: center;
  margin: 0 20rpx; /* 左右留边距 */
}

.nav-right {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 防止被压缩 */
}

.clear-all-btn {
  padding: 12rpx 16rpx;
  background-color: #ff4757;
  color: #ffffff;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  transition: all 0.2s ease;
  white-space: nowrap; /* 防止文字换行 */
}

.clear-all-btn:active {
  background-color: #ff3742;
  transform: scale(0.96);
}

.completed-stats {
  padding: 12rpx 24rpx 20rpx;
  text-align: center;
}

.stats-text {
  font-size: 24rpx;
  color: #6c757d;
}

.completed-list {
  flex: 1;
  padding: 24rpx;
}

/* 底部统计 */
.todo-stats {
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-stats text {
  font-size: 24rpx;
  color: #6c757d;
  background-color: #f8f9fa;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}
</style> 