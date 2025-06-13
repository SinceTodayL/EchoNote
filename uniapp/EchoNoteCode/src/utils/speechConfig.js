// 语音识别服务配置
// 注意：在生产环境中，API密钥应该通过后端接口获取，不要直接暴露在前端代码中

export const speechConfig = {
  // 百度语音识别配置
  baidu: {
    enabled: false, // 是否启用百度语音识别
    apiKey: 'your_baidu_api_key',
    secretKey: 'your_baidu_secret_key',
    url: 'https://vop.baidu.com/server_api'
  },
  
  // 腾讯云语音识别配置
  tencent: {
    enabled: false, // 是否启用腾讯云语音识别
    secretId: 'your_tencent_secret_id',
    secretKey: 'your_tencent_secret_key',
    region: 'ap-beijing',
    url: 'https://asr.tencentcloudapi.com'
  },
  
  // 阿里云语音识别配置
  aliyun: {
    enabled: false, // 是否启用阿里云语音识别
    accessKeyId: 'your_aliyun_access_key_id',
    accessKeySecret: 'your_aliyun_access_key_secret',
    url: 'https://nls-meta.cn-shanghai.aliyuncs.com'
  },
  
  // 微信云开发配置
  wxCloud: {
    enabled: true, // 是否启用微信云开发
    functionName: 'speechRecognition'
  },
  
  // 通用配置
  common: {
    maxDuration: 60000, // 最大录音时长（毫秒）
    format: 'mp3',
    sampleRate: 16000,
    channels: 1,
    language: 'zh-CN'
  }
}

// 获取可用的语音识别服务
export const getAvailableServices = () => {
  const services = []
  
  if (speechConfig.wxCloud.enabled) {
    services.push('wxCloud')
  }
  
  if (speechConfig.baidu.enabled && 
      speechConfig.baidu.apiKey !== 'your_baidu_api_key') {
    services.push('baidu')
  }
  
  if (speechConfig.tencent.enabled && 
      speechConfig.tencent.secretId !== 'your_tencent_secret_id') {
    services.push('tencent')
  }
  
  if (speechConfig.aliyun.enabled && 
      speechConfig.aliyun.accessKeyId !== 'your_aliyun_access_key_id') {
    services.push('aliyun')
  }
  
  return services
} 