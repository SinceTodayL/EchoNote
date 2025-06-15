// AI模型配置接口
export interface AIModelConfig {
  api_key: string
  base_url: string
  model: string
}

// API配置接口
export interface APIConfig {
  timeout: number
  maxRetries: number
  temperature: number
  max_tokens: number
}

// AI模型配置
export const AI_CONFIG: Record<string, AIModelConfig> = {
  tongyi: {
    // 阿里: 百炼大模型 通义千问
    api_key: "sk-ac991dda94c04536b1d393fcca9adb98",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-turbo"
  }
}

// 当前使用的AI模型
export const CURRENT_AI_MODEL = 'tongyi'

// API请求配置
export const API_CONFIG: APIConfig = {
  timeout: 30000, // 30秒超时
  maxRetries: 3,  // 最大重试次数
  temperature: 0.7, // 生成温度
  max_tokens: 2000, // 最大输出token数
} 