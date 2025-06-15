import { AI_CONFIG, CURRENT_AI_MODEL, API_CONFIG, type AIModelConfig, type APIConfig } from './aiConfig'

// 消息接口
export interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: number
}

// API消息格式
interface APIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// API响应格式
interface APIResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// UniApp请求响应格式
interface UniRequestResponse {
  statusCode: number
  data: any
  header: Record<string, string>
}

/**
 * AI服务类
 */
class AIService {
  private currentModel: string
  private config: AIModelConfig

  constructor() {
    this.currentModel = CURRENT_AI_MODEL
    this.config = AI_CONFIG[this.currentModel]
  }

  /**
   * 发送消息到AI模型
   * @param message - 用户消息
   * @param history - 对话历史
   * @returns AI回复
   */
  async sendMessage(message: string, history: Message[] = []): Promise<string> {
    try {
      // 构建消息列表
      const messages = this.buildMessages(message, history)
      
      // 发送请求
      const response = await this.makeRequest(messages)
      
      // 解析响应
      return this.parseResponse(response)
    } catch (error) {
      console.error('AI服务错误:', error)
      throw error
    }
  }

  /**
   * 构建消息列表
   * @param currentMessage - 当前消息
   * @param history - 历史消息
   * @returns 格式化的消息列表
   */
  private buildMessages(currentMessage: string, history: Message[] = []): APIMessage[] {
    const messages: APIMessage[] = []
    
    // 添加系统提示 - 包含结构化响应指令
    messages.push({
      role: 'system',
      content: `你是EchoNote AI助手，一个智能的个人知识管理和任务管理助手。

== 重要说明 ==
用户会在消息中提供他们的完整笔记内容和任务信息。你必须仔细阅读这些信息，并基于这些内容来回答用户的问题。

== 回答要求 ==
1. 仔细阅读用户提供的笔记内容，了解用户的学习、工作、生活情况
2. 基于用户的实际笔记内容回答问题，不要编造不存在的内容
3. 主动关联用户的笔记内容，提供有价值的见解和建议
4. 结合用户的任务情况提供个性化建议

== 操作命令格式 ==
当需要执行操作时，在回答末尾添加JSON命令：

可用命令：
- create_note: 创建笔记，参数：{"title": "标题", "content": "内容"}
- create_task: 创建任务，参数：{"text": "任务内容"}  
- search_notes: 搜索笔记，参数：{"keyword": "关键词"}

示例：
\`\`\`json
{
  "commands": [
    {
      "action": "create_task",
      "params": {
        "text": "明天考试"
      }
    }
  ]
}
\`\`\`

注意：只有在用户明确要求执行操作时才添加命令。

记住：你必须基于用户提供的实际笔记内容和任务信息来回答，展现出你真正了解用户的信息。`
    })
    
    // 添加历史对话（只保留最近10轮对话以控制token数量）
    const recentHistory = history.slice(-10)
    recentHistory.forEach(item => {
      messages.push({
        role: item.type === 'user' ? 'user' : 'assistant',
        content: item.content
      })
    })
    
    // 添加当前消息
    messages.push({
      role: 'user',
      content: currentMessage
    })
    
    return messages
  }

  /**
   * 发送HTTP请求到AI API
   * @param messages - 消息列表
   * @returns API响应
   */
  private async makeRequest(messages: APIMessage[]): Promise<APIResponse> {
    const url = `${this.config.base_url}/chat/completions`
    
    const requestData = {
      model: this.config.model,
      messages: messages,
      temperature: API_CONFIG.temperature,
      max_tokens: API_CONFIG.max_tokens,
      stream: false
    }

    console.log('发送AI请求:', {
      url,
      model: this.config.model, 
      messageCount: messages.length
    })

    return new Promise((resolve, reject) => {
      uni.request({
        url: url,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`
        },
        data: requestData,
        timeout: API_CONFIG.timeout,
        success: (res: UniRequestResponse) => {
          console.log('AI响应状态:', res.statusCode)
          console.log('AI响应数据:', res.data)
          
          if (res.statusCode === 200) {
            resolve(res.data as APIResponse)
          } else {
            reject(new Error(`API请求失败: ${res.statusCode} - ${JSON.stringify(res.data)}`))
          }
        },
        fail: (error: any) => {
          console.error('AI请求失败:', error)
          reject(new Error(`网络请求失败: ${error.errMsg || error.message || '未知错误'}`))
        }
      })
    })
  }

  /**
   * 解析AI API响应
   * @param response - API响应数据
   * @returns AI回复文本
   */
  private parseResponse(response: APIResponse): string {
    try {
      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0]
        if (choice.message && choice.message.content) {
          return choice.message.content.trim()
        }
      }
      
      throw new Error('响应格式异常')
    } catch (error) {
      console.error('解析AI响应失败:', error)
      throw new Error('解析AI响应失败')
    }
  }

  /**
   * 检查服务状态
   * @returns 服务是否可用
   */
  async checkService(): Promise<boolean> {
    try {
      const response = await this.sendMessage('你好')
      return !!response
    } catch (error) {
      console.error('AI服务检查失败:', error)
      return false
    }
  }
}

// 创建单例实例
const aiService = new AIService()

export default aiService

// 导出便捷方法
export const sendAIMessage = async (message: string, history: Message[] = []): Promise<string> => {
  return await aiService.sendMessage(message, history)
}

export const checkAIService = async (): Promise<boolean> => {
  return await aiService.checkService()
}

/**
 * 发送带有用户数据上下文的消息
 * @param message - 用户消息
 * @param history - 对话历史
 * @param userDataContext - 用户数据上下文
 * @returns AI回复
 */
export const sendAIMessageWithContext = async (
  message: string, 
  history: Message[] = [], 
  userDataContext?: string
): Promise<string> => {
  let enhancedMessage = message
  
  // 如果有用户数据上下文，直接添加到消息前面
  if (userDataContext && userDataContext.trim()) {
    enhancedMessage = `${userDataContext}

用户问题：${message}`
  }
  
  console.log('发送给AI的消息长度:', enhancedMessage.length)
  console.log('包含用户数据:', !!userDataContext)
  
  return await aiService.sendMessage(enhancedMessage, history)
} 