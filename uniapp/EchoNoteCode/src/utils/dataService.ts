/**
 * 数据服务 - 统一管理笔记和待办数据，供AI助手调用
 */

// 笔记接口
export interface Note {
  id: number
  title: string
  content: string
  updateTime: Date
  createTime?: Date
  isPinned?: boolean
  backgroundColor?: string
  isFavorite?: boolean
}

// 任务接口
export interface Task {
  id: number
  text: string
  completed: boolean
  createTime: number
  completedTime?: number
}

/**
 * 数据服务类
 */
class DataService {
  // 笔记相关操作
  /**
   * 获取所有笔记
   */
  async getAllNotes(): Promise<Note[]> {
    try {
      const notes = uni.getStorageSync('notes') || []
      return notes
    } catch (error) {
      console.error('获取笔记失败:', error)
      return []
    }
  }

  /**
   * 根据关键词搜索笔记
   */
  async searchNotes(keyword: string): Promise<Note[]> {
    try {
      const allNotes = await this.getAllNotes()
      const searchKey = keyword.toLowerCase()
      return allNotes.filter(note => 
        note.title.toLowerCase().includes(searchKey) || 
        note.content.toLowerCase().includes(searchKey)
      )
    } catch (error) {
      console.error('搜索笔记失败:', error)
      return []
    }
  }

  /**
   * 创建新笔记
   */
  async createNote(title: string, content: string, options?: {
    backgroundColor?: string
    isPinned?: boolean
    isFavorite?: boolean
  }): Promise<Note> {
    try {
      const newNote: Note = {
        id: Date.now(),
        title: title.trim() || '无标题',
        content: content.trim(),
        createTime: new Date(),
        updateTime: new Date(),
        isPinned: options?.isPinned || false,
        backgroundColor: options?.backgroundColor || '#FFF5E5',
        isFavorite: options?.isFavorite || false
      }

      const allNotes = await this.getAllNotes()
      allNotes.push(newNote)
      uni.setStorageSync('notes', allNotes)
      
      return newNote
    } catch (error) {
      console.error('创建笔记失败:', error)
      throw error
    }
  }

  /**
   * 更新笔记
   */
  async updateNote(id: number, updates: Partial<Note>): Promise<boolean> {
    try {
      const allNotes = await this.getAllNotes()
      const index = allNotes.findIndex(note => note.id === id)
      if (index === -1) {
        throw new Error('笔记不存在')
      }

      allNotes[index] = {
        ...allNotes[index],
        ...updates,
        updateTime: new Date()
      }
      
      uni.setStorageSync('notes', allNotes)
      return true
    } catch (error) {
      console.error('更新笔记失败:', error)
      return false
    }
  }

  /**
   * 删除笔记
   */
  async deleteNote(id: number): Promise<boolean> {
    try {
      const allNotes = await this.getAllNotes()
      const filteredNotes = allNotes.filter(note => note.id !== id)
      uni.setStorageSync('notes', filteredNotes)
      return true
    } catch (error) {
      console.error('删除笔记失败:', error)
      return false
    }
  }

  /**
   * 获取笔记摘要信息（增强版，供AI使用）
   */
  async getNoteSummary(): Promise<string> {
    try {
      const notes = await this.getAllNotes()
      if (notes.length === 0) {
        return '您还没有任何笔记。'
      }

      const totalNotes = notes.length
      const pinnedNotes = notes.filter(n => n.isPinned).length
      const favoriteNotes = notes.filter(n => n.isFavorite).length
      
      // 获取最近的笔记内容（用于AI理解）
      const recentNotes = notes
        .sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime())
        .slice(0, 5)
        .map(n => `标题：${n.title}\n内容：${n.content.substring(0, 200)}${n.content.length > 200 ? '...' : ''}`)
        .join('\n\n')

      return `📝 笔记概览：
总共有 ${totalNotes} 条笔记
其中 ${pinnedNotes} 条已置顶，${favoriteNotes} 条已收藏

最近的笔记内容：
${recentNotes}`
    } catch (error) {
      console.error('获取笔记摘要失败:', error)
      return '获取笔记摘要失败'
    }
  }

  /**
   * 获取完整的笔记内容（供AI深度理解）
   */
  async getFullNotesContext(): Promise<string> {
    try {
      const notes = await this.getAllNotes()
      if (notes.length === 0) {
        return '用户暂无笔记内容。'
      }

      // 按重要性排序：置顶 > 收藏 > 最近更新
      const sortedNotes = notes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
      })

      const notesContent = sortedNotes
        .slice(0, 10) // 最多取10条最重要的笔记
        .map((note, index) => {
          const priority = note.isPinned ? '[置顶]' : note.isFavorite ? '[收藏]' : ''
          return `${index + 1}. ${priority}${note.title}
内容：${note.content}
更新时间：${new Date(note.updateTime).toLocaleString()}`
        })
        .join('\n\n---\n\n')

      return `用户的笔记内容详情（按重要性排序）：

${notesContent}

注：以上是用户最重要的${Math.min(sortedNotes.length, 10)}条笔记内容，请基于这些信息来理解用户的需求和提供帮助。`
    } catch (error) {
      console.error('获取完整笔记上下文失败:', error)
      return '无法获取笔记内容。'
    }
  }

  // 任务相关操作
  /**
   * 获取所有待办任务
   */
  async getAllTasks(): Promise<{ pending: Task[], completed: Task[] }> {
    try {
      // 尝试从todo页面的存储格式读取
      const pendingTasks = uni.getStorageSync('todo_tasks') || []
      const completedTasks = uni.getStorageSync('todo_completed_tasks') || []
      
      return {
        pending: pendingTasks,
        completed: completedTasks
      }
    } catch (error) {
      console.error('获取任务失败:', error)
      return { pending: [], completed: [] }
    }
  }

  /**
   * 同步任务数据到todo页面格式
   */
  async syncTasksToTodoFormat(): Promise<void> {
    try {
      const allTasks = await this.getAllTasks()
      // 如果需要，可以在这里添加与todo页面的数据同步逻辑
      // 目前保持数据结构一致
    } catch (error) {
      console.error('同步任务数据失败:', error)
    }
  }

  /**
   * 创建新任务
   */
  async createTask(text: string): Promise<Task> {
    try {
      console.log('开始创建任务:', text)
      
      const newTask: Task = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createTime: Date.now()
      }
      
      console.log('新任务对象:', newTask)

      const allTasks = await this.getAllTasks()
      console.log('获取的现有任务:', allTasks)
      
      allTasks.pending.push(newTask)
      console.log('添加后的待办任务:', allTasks.pending)
      
      // 同步保存到todo页面的存储格式
      uni.setStorageSync('todo_tasks', allTasks.pending)
      uni.setStorageSync('todo_completed_tasks', allTasks.completed)
      
      console.log('任务已保存到存储，验证保存结果:')
      console.log('todo_tasks:', uni.getStorageSync('todo_tasks'))
      console.log('todo_completed_tasks:', uni.getStorageSync('todo_completed_tasks'))
      
      return newTask
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    }
  }

  /**
   * 批量创建任务
   */
  async createMultipleTasks(taskTexts: string[]): Promise<Task[]> {
    try {
      const tasks: Task[] = []
      const allTasks = await this.getAllTasks()
      
      for (const text of taskTexts) {
        if (text.trim()) {
          const newTask: Task = {
            id: Date.now() + Math.random(),
            text: text.trim(),
            completed: false,
            createTime: Date.now()
          }
          tasks.push(newTask)
          allTasks.pending.push(newTask)
        }
      }
      
      // 同步保存到todo页面的存储格式
      uni.setStorageSync('todo_tasks', allTasks.pending)
      uni.setStorageSync('todo_completed_tasks', allTasks.completed)
      
      return tasks
    } catch (error) {
      console.error('批量创建任务失败:', error)
      throw error
    }
  }

  /**
   * 完成任务
   */
  async completeTask(id: number): Promise<boolean> {
    try {
      const allTasks = await this.getAllTasks()
      const taskIndex = allTasks.pending.findIndex(task => task.id === id)
      
      if (taskIndex === -1) {
        return false
      }

      const task = allTasks.pending[taskIndex]
      task.completed = true
      task.completedTime = Date.now()
      
      allTasks.completed.push(task)
      allTasks.pending.splice(taskIndex, 1)
      
      // 同步保存到todo页面的存储格式
      uni.setStorageSync('todo_tasks', allTasks.pending)
      uni.setStorageSync('todo_completed_tasks', allTasks.completed)
      
      return true
    } catch (error) {
      console.error('完成任务失败:', error)
      return false
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(id: number): Promise<boolean> {
    try {
      const allTasks = await this.getAllTasks()
      allTasks.pending = allTasks.pending.filter(task => task.id !== id)
      allTasks.completed = allTasks.completed.filter(task => task.id !== id)
      
      // 同步保存到todo页面的存储格式
      uni.setStorageSync('todo_tasks', allTasks.pending)
      uni.setStorageSync('todo_completed_tasks', allTasks.completed)
      
      return true
    } catch (error) {
      console.error('删除任务失败:', error)
      return false
    }
  }

  /**
   * 获取任务摘要信息（增强版，供AI使用）
   */
  async getTaskSummary(): Promise<string> {
    try {
      const { pending, completed } = await this.getAllTasks()
      
      if (pending.length === 0 && completed.length === 0) {
        return '您还没有任何任务。'
      }

      const todayTasks = pending.filter(task => {
        const taskDate = new Date(task.createTime).toDateString()
        const today = new Date().toDateString()
        return taskDate === today
      })

      // 获取最近的待办任务详情
      const recentPendingTasks = pending
        .sort((a, b) => b.createTime - a.createTime)
        .slice(0, 8)
        .map((task, index) => `${index + 1}. ${task.text} (创建于：${new Date(task.createTime).toLocaleString()})`)
        .join('\n')

      // 获取最近完成的任务
      const recentCompletedTasks = completed
        .sort((a, b) => (b.completedTime || 0) - (a.completedTime || 0))
        .slice(0, 5)
        .map((task, index) => `${index + 1}. ${task.text} (完成于：${new Date(task.completedTime || 0).toLocaleString()})`)
        .join('\n')

      return `✅ 任务概览：
待办任务：${pending.length} 项
已完成任务：${completed.length} 项
今日新增：${todayTasks.length} 项

当前待办事项：
${recentPendingTasks || '暂无待办事项'}

最近完成的任务：
${recentCompletedTasks || '暂无已完成任务'}

注：请基于以上任务信息来帮助用户管理和规划任务。`
    } catch (error) {
      console.error('获取任务摘要失败:', error)
      return '获取任务摘要失败'
    }
  }

  /**
   * 获取完整的任务上下文（供AI深度理解）
   */
  async getFullTasksContext(): Promise<string> {
    try {
      const { pending, completed } = await this.getAllTasks()
      
      if (pending.length === 0 && completed.length === 0) {
        return '用户暂无任务记录。'
      }

      let context = '用户的完整任务情况：\n\n'

      if (pending.length > 0) {
        context += `=== 待办任务（${pending.length}项）===\n`
        const pendingList = pending
          .sort((a, b) => b.createTime - a.createTime)
          .map((task, index) => `${index + 1}. ${task.text}\n   创建时间：${new Date(task.createTime).toLocaleString()}`)
          .join('\n')
        context += pendingList + '\n\n'
      }

      if (completed.length > 0) {
        context += `=== 已完成任务（${completed.length}项）===\n`
        const completedList = completed
          .sort((a, b) => (b.completedTime || 0) - (a.completedTime || 0))
          .slice(0, 10) // 最多显示10个已完成任务
          .map((task, index) => `${index + 1}. ${task.text}\n   完成时间：${new Date(task.completedTime || 0).toLocaleString()}`)
          .join('\n')
        context += completedList + '\n\n'
      }

      context += '注：请根据用户的任务情况提供个性化的建议和帮助。'

      return context
    } catch (error) {
      console.error('获取完整任务上下文失败:', error)
      return '无法获取任务信息。'
    }
  }

  /**
   * 根据笔记内容解析出可能的任务
   */
  parseTasksFromNote(noteContent: string): string[] {
    const tasks: string[] = []
    const lines = noteContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      // 匹配任务格式: - [ ] 任务内容 或 - 任务内容 或 数字. 任务内容
      if (trimmed.match(/^[-*]\s*(\[.\])?\s*.+/) || trimmed.match(/^\d+\.\s*.+/)) {
        const taskText = trimmed
          .replace(/^[-*]\s*(\[.\])?\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim()
        if (taskText && taskText.length > 0) {
          tasks.push(taskText)
        }
      }
    }
    
    return tasks
  }
}

// 创建单例实例
const dataService = new DataService()

export default dataService

// 导出便捷方法
export const {
  // 笔记相关操作
  createNote,
  updateNote,
  deleteNote,
  getAllNotes,
  searchNotes,
  getNoteSummary,
  getFullNotesContext,
  
  // 任务相关操作
  createTask,
  createMultipleTasks,
  completeTask,
  deleteTask,
  getTaskSummary,
  getFullTasksContext,
  parseTasksFromNote
} = dataService 