/**
 * 文件存储工具
 * 提供笔记的本地存储功能
 */

export interface Note {
  id: number
  title: string
  content: string
  createTime: number
  updateTime: number
  backgroundColor?: string
  isFavorite?: boolean
  isPinned?: boolean
}

/**
 * 保存笔记到本地存储
 * @param note 笔记数据
 * @returns 是否保存成功
 */
export const saveNote = async (note: Note): Promise<boolean> => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    const existingIndex = allNotes.findIndex((n: Note) => n.id === note.id)
    
    if (existingIndex > -1) {
      allNotes[existingIndex] = note
    } else {
      allNotes.push(note)
    }
    
    uni.setStorageSync('notes', allNotes)
    return true
  } catch (e) {
    console.error('保存笔记失败:', e)
    return false
  }
}

/**
 * 从本地存储加载笔记
 * @param id 笔记ID
 * @returns 笔记数据或null
 */
export const loadNote = async (id: number): Promise<Note | null> => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    return allNotes.find((n: Note) => n.id === id) || null
  } catch (e) {
    console.error('加载笔记失败:', e)
    return null
  }
}

/**
 * 获取所有笔记
 * @returns 所有笔记数组
 */
export const getAllNotes = async (): Promise<Note[]> => {
  try {
    return uni.getStorageSync('notes') || []
  } catch (e) {
    console.error('获取所有笔记失败:', e)
    return []
  }
}

/**
 * 删除笔记
 * @param id 笔记ID
 * @returns 是否删除成功
 */
export const deleteNote = async (id: number): Promise<boolean> => {
  try {
    const allNotes = uni.getStorageSync('notes') || []
    const newNotes = allNotes.filter((n: Note) => n.id !== id)
    uni.setStorageSync('notes', newNotes)
    return true
  } catch (e) {
    console.error('删除笔记失败:', e)
    return false
  }
} 