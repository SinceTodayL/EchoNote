<template>
  <view class="todo-container">
    <!-- 顶部添加任务栏 -->
    <view class="add-task-bar">
      <input 
        type="text" 
        v-model="newTask"
        placeholder="添加新的待办事项" 
        class="task-input"
        @keypress.enter="addTask"
      />
      <button class="add-btn" @click="addTask">添加</button>
    </view>

    <!-- 任务列表 -->
    <scroll-view scroll-y="true" class="todo-list">
      <view 
        v-for="task in tasks" 
        :key="task.id" 
        class="todo-item"
        :class="{ 'completed': task.completed }"
      >
        <view class="task-content">
          <checkbox 
            :checked="task.completed"
            @click="toggleTask(task.id)"
            class="task-checkbox"
          />
          <text class="task-text">{{ task.text }}</text>
        </view>
        <view class="task-actions">
          <uni-icons 
            type="trash" 
            size="20" 
            color="#999"
            @click="deleteTask(task.id)"
          ></uni-icons>
        </view>
      </view>
    </scroll-view>

    <!-- 底部统计 -->
    <view class="todo-stats">
      <text>剩余 {{ remainingTasks }} 项任务</text>
      <text @click="clearCompleted" class="clear-completed">清除已完成</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Task {
  id: number
  text: string
  completed: boolean
}

const newTask = ref('')
const tasks = ref<Task[]>([
  { id: 1, text: '示例任务', completed: false }
])

// 添加新任务
const addTask = () => {
  if (!newTask.value.trim()) return
  const task: Task = {
    id: Date.now(),
    text: newTask.value.trim(),
    completed: false
  }
  tasks.value.push(task)
  newTask.value = ''
}

// 切换任务状态
const toggleTask = (id: number) => {
  const task = tasks.value.find(t => t.id === id)
  if (task) {
    task.completed = !task.completed
  }
}

// 删除任务
const deleteTask = (id: number) => {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

// 清除已完成的任务
const clearCompleted = () => {
  tasks.value = tasks.value.filter(t => !t.completed)
}

// 计算剩余任务数量
const remainingTasks = computed(() => {
  return tasks.value.filter(t => !t.completed).length
})
</script>

<style>
.todo-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f8f8;
}

.add-task-bar {
  padding: 20rpx;
  background-color: #ffffff;
  display: flex;
  gap: 20rpx;
}

.task-input {
  flex: 1;
  padding: 20rpx;
  border-radius: 10rpx;
  background-color: #f0f0f0;
  font-size: 28rpx;
}

.add-btn {
  padding: 0 40rpx;
  background-color: #3cc51f;
  color: #ffffff;
  border-radius: 10rpx;
  font-size: 28rpx;
  line-height: 2.5;
}

.todo-list {
  flex: 1;
  padding: 20rpx;
}

.todo-item {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.task-checkbox {
  transform: scale(0.8);
}

.task-text {
  font-size: 28rpx;
  color: #333;
}

.completed .task-text {
  text-decoration: line-through;
  color: #999;
}

.todo-stats {
  padding: 20rpx;
  background-color: #ffffff;
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #666;
  border-top: 1rpx solid #eee;
}

.clear-completed {
  color: #3cc51f;
}
</style> 