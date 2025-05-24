// 笔记类型定义
interface Note {
  id: number
  title: string
  content: string
  backgroundColor: string
  isFavorite: boolean
  isPinned: boolean
  createTime: number
  updateTime: number
}

// 从 localStorage 迁移数据（暂时不操作）
export const migrateFromLocalStorage = async () => {
  // 暂时不进行迁移操作，直接返回成功
  return true
}

// 保存笔记
export const saveNote = async (note: Note) => {
  try {
    const notes = uni.getStorageSync('notes') || []
    const existingIndex = notes.findIndex((n: any) => n.id === note.id)
    
    if (existingIndex > -1) {
      notes[existingIndex] = note
    } else {
      notes.unshift(note)
    }
    
    uni.setStorageSync('notes', notes)
    return true
  } catch (error) {
    console.error('保存笔记时出错:', error)
    return false
  }
}

// 读取笔记
export const loadNote = async (id: number) => {
  try {
    const notes = uni.getStorageSync('notes') || []
    const note = notes.find((n: any) => n.id === id)
    return note || null
  } catch (error) {
    console.error('读取笔记时出错:', error)
    return null
  }
}

// 删除笔记
export const deleteNote = async (id: number) => {
  try {
    const notes = uni.getStorageSync('notes') || []
    const newNotes = notes.filter((n: any) => n.id !== id)
    uni.setStorageSync('notes', newNotes)
    return true
  } catch (error) {
    console.error('删除笔记时出错:', error)
    return false
  }
}

// 获取所有笔记
export const getAllNotes = async () => {
  try {
    const notes = uni.getStorageSync('notes') || []
    return notes.sort((a: any, b: any) => b.updateTime - a.updateTime)
  } catch (error) {
    console.error('获取所有笔记时出错:', error)
    return []
  }
}
