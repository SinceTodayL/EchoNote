import CryptoJS from 'crypto-js'

interface XunfeiConfig {
  appId: string
  apiSecret: string
  apiKey: string
}

export class SpeechRecognition {
  private config: XunfeiConfig
  private websocket: any = null
  private recorder: any = null
  private isRecording: boolean = false
  private onResultCallback: ((text: string, isEnd: boolean) => void) | null = null
  private onStatusCallback: ((status: string) => void) | null = null
  private currentText: string = ''
  private lastResult: string = ''

  constructor(config: XunfeiConfig) {
    this.config = config
    this.initRecorder()
  }

  private initRecorder() {
    try {
      console.log('开始初始化录音管理器...')

      // #ifdef H5
      console.log('当前环境: H5')
      // H5环境下不使用 uni.getRecorderManager，而是使用 Web Audio API
      this.recorder = {
        start: (options: any) => {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const mediaStreamSource = audioContext.createMediaStreamSource(stream);
              const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);
              
              mediaStreamSource.connect(scriptProcessor);
              scriptProcessor.connect(audioContext.destination);
              
              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputBuffer = audioProcessingEvent.inputBuffer;
                const inputData = inputBuffer.getChannelData(0);
                
                // 将 Float32Array 转换为 Int16Array
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = inputData[i] * 0x7FFF;
                }
                
                if (this.websocket && this.websocket.readyState === 1) {
                  this.sendAudioData(pcmData.buffer);
                }
              };

              (this.recorder as any)._stream = stream;
              (this.recorder as any)._audioContext = audioContext;
              (this.recorder as any)._scriptProcessor = scriptProcessor;
              
              if (this.onStatusCallback) {
                this.onStatusCallback('开始录音');
              }
            })
            .catch(err => {
              console.error('获取麦克风失败:', err);
              if (this.onStatusCallback) {
                this.onStatusCallback('获取麦克风失败');
              }
            });
        },
        stop: () => {
          if ((this.recorder as any)._stream) {
            (this.recorder as any)._stream.getTracks().forEach((track: any) => track.stop());
          }
          if ((this.recorder as any)._audioContext) {
            (this.recorder as any)._scriptProcessor.disconnect();
            (this.recorder as any)._audioContext.close();
          }
          if (this.onStatusCallback) {
            this.onStatusCallback('录音结束');
          }
        },
        onStart: (callback: () => void) => {
          (this.recorder as any)._onStart = callback;
        },
        onStop: (callback: () => void) => {
          (this.recorder as any)._onStop = callback;
        },
        onError: (callback: (error: any) => void) => {
          (this.recorder as any)._onError = callback;
        }
      };
      console.log('H5录音管理器初始化成功');
      return;
      // #endif

      // #ifdef APP-PLUS || MP-WEIXIN
      console.log('当前环境: APP/小程序')
      if (typeof uni.getRecorderManager !== 'function') {
        throw new Error('当前环境不支持录音功能')
      }

      this.recorder = uni.getRecorderManager()
      
      if (!this.recorder) {
        throw new Error('录音管理器创建失败')
      }

      // 绑定事件处理器
      const bindEvent = (eventName: string, handler: Function) => {
        try {
          if (typeof this.recorder[eventName] === 'function') {
            this.recorder[eventName](handler)
            console.log(`成功绑定${eventName}事件`)
          } else {
            console.warn(`${eventName}事件不可用`)
          }
        } catch (err) {
          console.error(`绑定${eventName}事件失败:`, err)
        }
      }

      bindEvent('onStart', () => {
        console.log('录音开始')
        this.onStatusCallback?.('开始录音')
      })

      bindEvent('onStop', () => {
        console.log('录音结束')
        if (this.websocket && this.websocket.readyState === 1) {
          this.sendAudioEnd()
        }
        this.onStatusCallback?.('录音结束')
      })

      bindEvent('onError', (error: any) => {
        console.error('录音错误:', error)
        this.onStatusCallback?.('录音错误：' + (error.errMsg || '未知错误'))
        this.stopRecording()
      })

      bindEvent('onFrameRecorded', (res: any) => {
        if (!res || !res.frameBuffer) {
          console.warn('接收到空的录音帧')
          return
        }
        if (this.websocket && this.websocket.readyState === 1) {
          this.sendAudioData(res.frameBuffer)
        }
      })
      // #endif

      console.log('录音管理器初始化完成')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      console.error('录音管理器初始化失败:', errorMsg)
      throw new Error(`录音功能初始化失败: ${errorMsg}`)
    }
  }

  private getWebSocketUrl(): string {
    const host = 'wss://iat-api.xfyun.cn/v2/iat'
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: iat-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.config.apiSecret)
    const signature = CryptoJS.enc.Base64.stringify(signatureSha)
    const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = btoa(authorizationOrigin)
    
    // 确保所有参数都正确编码
    const params = new URLSearchParams()
    params.append('authorization', authorization)
    params.append('date', date)
    params.append('host', 'iat-api.xfyun.cn')
    
    return `${host}?${params.toString()}`
  }

  private initWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('开始初始化WebSocket连接...')

        // 如果已经有活跃的连接，先关闭它
        if (this.websocket) {
          try {
            this.websocket.close()
            this.websocket = null
          } catch (e) {
            console.warn('关闭旧连接失败:', e)
          }
        }

        const url = this.getWebSocketUrl()
        console.log('WebSocket URL:', url)

        // 在H5环境中使用原生WebSocket
        // #ifdef H5
        try {
          this.websocket = new WebSocket(url)
          console.log('WebSocket实例创建成功')

          this.websocket.onopen = () => {
            console.log('WebSocket连接已打开')
            try {
              this.sendStartParams()
              resolve()
            } catch (error) {
              console.error('发送启动参数失败:', error)
              reject(error)
            }
          }

          this.websocket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              this.handleMessage(data)
            } catch (error) {
              console.error('处理WebSocket消息失败:', error)
            }
          }

          this.websocket.onerror = (error) => {
            console.error('WebSocket错误:', error)
            this.onStatusCallback?.('连接错误')
            reject(error)
          }

          this.websocket.onclose = (event) => {
            console.log('WebSocket连接已关闭:', event.code, event.reason)
            this.websocket = null
          }
        } catch (error) {
          console.error('创建WebSocket实例失败:', error)
          reject(error)
        }
        // #endif

        // 在非H5环境中使用uni.connectSocket
        // #ifdef APP-PLUS || MP-WEIXIN
        try {
          const socketTask = uni.connectSocket({
            url,
            success: () => {
              console.log('WebSocket连接创建成功')
            },
            fail: (err) => {
              console.error('创建WebSocket连接失败:', err)
              reject(new Error('创建WebSocket连接失败'))
            }
          })

          this.websocket = socketTask
          
          socketTask.onOpen(() => {
            console.log('WebSocket连接已打开')
            try {
              this.sendStartParams()
              resolve()
            } catch (error) {
              console.error('发送启动参数失败:', error)
              reject(error)
            }
          })

          socketTask.onMessage((res) => {
            try {
              const data = JSON.parse(res.data)
              this.handleMessage(data)
            } catch (error) {
              console.error('处理WebSocket消息失败:', error)
            }
          })

          socketTask.onError((err) => {
            console.error('WebSocket错误:', err)
            this.onStatusCallback?.('连接错误')
            reject(err)
          })

          socketTask.onClose((event) => {
            console.log('WebSocket连接已关闭')
            this.websocket = null
          })
        } catch (error) {
          console.error('创建WebSocket连接失败:', error)
          reject(error)
        }
        // #endif

      } catch (error) {
        console.error('WebSocket初始化失败:', error)
        reject(error)
      }
    })
  }

  private sendStartParams() {
    console.log('准备发送启动参数...')
    const params = {
      common: {
        app_id: this.config.appId
      },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        vad_eos: 3000,
        dwa: 'wpgs',
        pd: 'game',
        ptt: 0,
        rlang: 'zh-cn',
        vinfo: 1
      },
      data: {
        status: 0,
        format: 'audio/L16;rate=16000',
        encoding: 'raw'
      }
    }

    try {
      // #ifdef H5
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(params))
        console.log('H5环境: 启动参数发送成功')
      } else {
        throw new Error('WebSocket未连接')
      }
      // #endif

      // #ifdef APP-PLUS || MP-WEIXIN
      if (this.websocket) {
        this.websocket.send({
          data: JSON.stringify(params),
          success: () => console.log('APP/小程序环境: 启动参数发送成功'),
          fail: (err) => {
            console.error('发送启动参数失败:', err)
            throw err
          }
        })
      } else {
        throw new Error('WebSocket未初始化')
      }
      // #endif
    } catch (error) {
      console.error('发送启动参数时出错:', error)
      throw error
    }
  }

  private sendAudioData(buffer: ArrayBuffer) {
    if (!this.websocket || (this.websocket.readyState !== 1 && !this.websocket.readyState)) return

    try {
      let audioData
      // #ifdef H5
      // 在H5环境中，需要手动将ArrayBuffer转换为Base64
      audioData = this.arrayBufferToBase64(buffer)
      // #endif

      // #ifdef APP-PLUS || MP-WEIXIN
      audioData = uni.arrayBufferToBase64(buffer)
      // #endif

      const frame = {
        data: {
          status: 1,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: audioData
        }
      }

      // #ifdef H5
      this.websocket.send(JSON.stringify(frame))
      // #endif

      // #ifdef APP-PLUS || MP-WEIXIN
      this.websocket.send({
        data: JSON.stringify(frame),
        fail: (err: any) => console.error('发送音频数据失败:', err)
      })
      // #endif
    } catch (error) {
      console.error('发送音频数据时出错:', error)
    }
  }

  // 添加ArrayBuffer转Base64的辅助方法
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  private sendAudioEnd() {
    if (!this.websocket || this.websocket.readyState !== 1) return

    const frame = {
      data: {
        status: 2,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: ''
      }
    }

    this.websocket.send({
      data: JSON.stringify(frame),
      success: () => console.log('Sent end frame'),
      fail: (err: any) => console.error('Failed to send end frame:', err)
    })
  }

  private handleMessage(message: any) {
    if (message.code !== 0) {
      console.error('Error message:', message)
      this.onStatusCallback?.(`错误：${message.message}`)
      return
    }

    const str = this.parseResult(message)
    if (str === null) return

    // 如果是最终结果
    if (message.data.status === 2) {
      this.lastResult = this.currentText
      this.onResultCallback?.(this.currentText, true)
      this.currentText = ''
    } 
    // 如果是中间结果
    else if (this.currentText !== str) {
      this.currentText = str
      this.onResultCallback?.(str, false)
    }
  }

  private parseResult(message: any): string | null {
    if (!message.data || !message.data.result) return null

    let result = ''
    const words = message.data.result.ws
    if (!words) return null

    for (const word of words) {
      if (word.cw && word.cw[0]) {
        result += word.cw[0].w
      }
    }

    return result
  }

  public async startRecording(
    onResult: (text: string, isEnd: boolean) => void,
    onStatus: (status: string) => void
  ): Promise<void> {
    try {
      console.log('准备开始录音...')
      
      if (this.isRecording) {
        throw new Error('已经在录音中')
      }

      this.onResultCallback = onResult
      this.onStatusCallback = onStatus
      this.currentText = ''
      this.lastResult = ''

      // 初始化WebSocket连接
      console.log('初始化WebSocket连接...')
      await this.initWebSocket()
      console.log('WebSocket连接初始化完成')

      // 确保录音管理器存在
      if (!this.recorder) {
        console.log('录音管理器不存在，重新初始化')
        this.initRecorder()
      }

      // 开始录音
      console.log('开始录音...')
      const recorderConfig = {
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'PCM',
        frameSize: 1280
      }
      console.log('录音配置:', recorderConfig)

      this.recorder.start(recorderConfig)
      this.isRecording = true
      console.log('录音已开始')

    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      console.error('启动录音失败:', errorMsg)
      this.onStatusCallback?.(errorMsg)
      throw error
    }
  }

  public stopRecording() {
    if (!this.isRecording) return

    this.isRecording = false
    if (this.recorder) {
      this.recorder.stop()
    }

    // 延迟关闭WebSocket，确保最后的数据都发送完成
    setTimeout(() => {
      if (this.websocket) {
        this.websocket.close({
          success: () => console.log('WebSocket closed successfully'),
          fail: (err: any) => console.error('Failed to close WebSocket:', err)
        })
        this.websocket = null
      }
    }, 500)
  }
}

// 导出讯飞配置
export const xunfeiConfig: XunfeiConfig = {
  appId: '184b0e56',
  apiSecret: 'NTA4ZTIzMzEwNDYwYjlhNmI0NWUzMjgw',
  apiKey: '8d6dfdca1499953b78111d6dafdfd87b'
} 