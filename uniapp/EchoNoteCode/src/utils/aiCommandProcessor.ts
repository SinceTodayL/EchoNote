/**
 * AI命令处理器 - 解析AI返回的结构化指令并执行操作
 */

import dataService from './dataService'

// AI返回的结构化响应接口
export interface AIStructuredResponse {
  reply: string // 给用户的回答
  commands: AICommand[] // 要执行的命令列表
}

// AI命令接口
export interface AICommand {
  action: string // 操作类型
  params: Record<string, any> // 操作参数
}

// 执行结果接口
export interface ExecutionResult {
  success: boolean
  message: string
  data?: any
}

/**
 * AI命令处理器类
 */
class AICommandProcessor {
  
  /**
   * 解析AI返回的结构化响应
   */
  parseAIResponse(aiResponse: string): AIStructuredResponse {
    console.log('收到AI原始响应:', aiResponse)
    
    try {
      // 尝试从AI回复中提取JSON格式的命令
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch) {
        console.log('找到JSON代码块:', jsonMatch[1])
        const jsonContent = jsonMatch[1];
        
        try {
          const parsed = JSON.parse(jsonContent);
          
          // 移除回复中的JSON部分，保留纯文本回答
          const reply = aiResponse.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
          
          const result = {
            reply: reply || parsed.reply || '操作已处理',
            commands: Array.isArray(parsed.commands) ? parsed.commands : []
          };
          
          console.log('JSON解析结果:', result)
          return result;
        } catch (jsonError) {
          console.error('JSON解析失败:', jsonError)
          // JSON解析失败，返回原始回复
          return {
            reply: aiResponse,
            commands: []
          };
        }
      }
      
      // 如果没有找到JSON格式，尝试解析整体JSON
      try {
        console.log('尝试解析整体JSON')
        const parsed = JSON.parse(aiResponse);
        const result = {
          reply: parsed.reply || aiResponse,
          commands: Array.isArray(parsed.commands) ? parsed.commands : []
        };
        console.log('整体JSON解析结果:', result)
        return result;
      } catch {
        // 如果都解析失败，返回原始回复，无命令
        console.log('没有找到JSON命令，返回原始回复')
        return {
          reply: aiResponse,
          commands: []
        };
      }
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return {
        reply: aiResponse,
        commands: []
      };
    }
  }

  /**
   * 执行AI命令列表
   */
  async executeCommands(commands: AICommand[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const command of commands) {
      try {
        const result = await this.executeCommand(command);
        results.push(result);
      } catch (error) {
        console.error('执行命令失败:', command, error);
        results.push({
          success: false,
          message: `执行${command.action}失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    }
    
    return results;
  }

  /**
   * 执行单个AI命令
   */
  private async executeCommand(command: AICommand): Promise<ExecutionResult> {
    const { action, params } = command;
    
    switch (action) {
      case 'create_note':
        return await this.createNote(params);
      
      case 'search_notes':
        return await this.searchNotes(params);
      
      case 'get_notes_summary':
        return await this.getNotesSummary(params);
      
      case 'delete_note':
        return await this.deleteNote(params);
      
      case 'update_note':
        return await this.updateNote(params);
      
      case 'create_task':
        return await this.createTask(params);
      
      case 'create_multiple_tasks':
        return await this.createMultipleTasks(params);
      
      case 'get_tasks_summary':
        return await this.getTasksSummary(params);
      
      case 'complete_task':
        return await this.completeTask(params);
      
      case 'delete_task':
        return await this.deleteTask(params);
      
      case 'get_incomplete_tasks':
        return await this.getIncompleteTasks(params);
      
      default:
        return {
          success: false,
          message: `未知的操作类型: ${action}`
        };
    }
  }

  /**
   * 创建笔记
   */
  private async createNote(params: any): Promise<ExecutionResult> {
    try {
      const { title, content, options } = params;
      const note = await dataService.createNote(title, content, options);
      return {
        success: true,
        message: `✅ 已创建笔记"${note.title}"`,
        data: { note }
      };
    } catch (error) {
      return {
        success: false,
        message: '创建笔记失败'
      };
    }
  }

  /**
   * 搜索笔记
   */
  private async searchNotes(params: any): Promise<ExecutionResult> {
    try {
      const { keyword } = params;
      const notes = await dataService.searchNotes(keyword);
      
      if (notes.length === 0) {
        return {
          success: true,
          message: `没有找到包含"${keyword}"的笔记`,
          data: { notes: [] }
        };
      }
      
      const notesList = notes.slice(0, 5).map(note => ({
        title: note.title,
        preview: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
        id: note.id
      }));
      
      return {
        success: true,
        message: `找到 ${notes.length} 条相关笔记`,
        data: { notes: notesList, total: notes.length }
      };
    } catch (error) {
      return {
        success: false,
        message: '搜索笔记失败'
      };
    }
  }

  /**
   * 获取笔记摘要
   */
  private async getNotesSummary(params: any): Promise<ExecutionResult> {
    try {
      const summary = await dataService.getNoteSummary();
      return {
        success: true,
        message: summary,
        data: { summary }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取笔记摘要失败'
      };
    }
  }

  /**
   * 删除笔记
   */
  private async deleteNote(params: any): Promise<ExecutionResult> {
    try {
      const { id } = params;
      const success = await dataService.deleteNote(id);
      return {
        success,
        message: success ? '✅ 笔记已删除' : '删除笔记失败'
      };
    } catch (error) {
      return {
        success: false,
        message: '删除笔记失败'
      };
    }
  }

  /**
   * 更新笔记
   */
  private async updateNote(params: any): Promise<ExecutionResult> {
    try {
      const { id, updates } = params;
      const success = await dataService.updateNote(id, updates);
      return {
        success,
        message: success ? '✅ 笔记已更新' : '更新笔记失败'
      };
    } catch (error) {
      return {
        success: false,
        message: '更新笔记失败'
      };
    }
  }

  /**
   * 创建任务
   */
  private async createTask(params: any): Promise<ExecutionResult> {
    try {
      console.log('AI命令处理器：开始创建任务，参数:', params)
      
      // 支持多种参数名称：text, title, content, task
      const taskText = params.text || params.title || params.content || params.task;
      
      if (!taskText) {
        console.error('创建任务失败：缺少任务文本，参数:', params)
        return {
          success: false,
          message: '创建任务失败：缺少任务文本'
        };
      }
      
      console.log('调用dataService.createTask，任务文本:', taskText)
      const task = await dataService.createTask(taskText);
      console.log('dataService.createTask返回结果:', task)
      
      const result = {
        success: true,
        message: `✅ 已添加任务："${task.text}"`,
        data: { task }
      };
      
      console.log('createTask执行完成，返回结果:', result)
      return result;
    } catch (error) {
      console.error('创建任务异常:', error)
      return {
        success: false,
        message: `创建任务失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 批量创建任务
   */
  private async createMultipleTasks(params: any): Promise<ExecutionResult> {
    try {
      const { tasks } = params;
      const newTasks = await dataService.createMultipleTasks(tasks);
      return {
        success: true,
        message: `✅ 已添加 ${newTasks.length} 个任务`,
        data: { tasks: newTasks }
      };
    } catch (error) {
      return {
        success: false,
        message: '批量创建任务失败'
      };
    }
  }

  /**
   * 获取任务摘要
   */
  private async getTasksSummary(params: any): Promise<ExecutionResult> {
    try {
      const summary = await dataService.getTaskSummary();
      return {
        success: true,
        message: summary,
        data: { summary }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取任务摘要失败'
      };
    }
  }

  /**
   * 完成任务
   */
  private async completeTask(params: any): Promise<ExecutionResult> {
    try {
      const { id } = params;
      const success = await dataService.completeTask(id);
      return {
        success,
        message: success ? '✅ 任务已完成' : '完成任务失败'
      };
    } catch (error) {
      return {
        success: false,
        message: '完成任务失败'
      };
    }
  }

  /**
   * 删除任务
   */
  private async deleteTask(params: any): Promise<ExecutionResult> {
    try {
      const { id } = params;
      const success = await dataService.deleteTask(id);
      return {
        success,
        message: success ? '✅ 任务已删除' : '删除任务失败'
      };
    } catch (error) {
      return {
        success: false,
        message: '删除任务失败'
      };
    }
  }

  /**
   * 获取未完成的任务
   */
  private async getIncompleteTasks(params: any): Promise<ExecutionResult> {
    try {
      const { pending } = await dataService.getAllTasks();
      const recentTasks = pending
        .sort((a, b) => b.createTime - a.createTime)
        .slice(0, 10)
        .map(task => ({
          id: task.id,
          text: task.text,
          createTime: task.createTime
        }));
      
      return {
        success: true,
        message: `当前有 ${pending.length} 个未完成的任务`,
        data: { tasks: recentTasks, total: pending.length }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取未完成任务失败'
      };
    }
  }
}

// 创建单例实例
const aiCommandProcessor = new AICommandProcessor();

export default aiCommandProcessor; 