import { speechToText } from '@/api'

export interface VoiceRecorderOptions {
  duration?: number
  sampleRate?: number
  numberOfChannels?: number
  encodeBitRate?: number
  format?: 'mp3' | 'wav' | 'aac'
}

export interface VoiceRecognizeResult {
  text: string
  confidence: number
  duration?: number
}

class VoiceService {
  private recorder: any = null
  private isRecording = false
  private tempFilePath = ''
  private recordStartTime = 0

  init(): void {
    if (typeof uni !== 'undefined' && uni.getRecorderManager) {
      this.recorder = uni.getRecorderManager()

      this.recorder.onStart(() => {
        this.isRecording = true
        this.recordStartTime = Date.now()
      })

      this.recorder.onStop((res: any) => {
        this.isRecording = false
        this.tempFilePath = res.tempFilePath
      })

      this.recorder.onError((err: any) => {
        this.isRecording = false
        console.error('录音错误:', err)
      })

      this.recorder.onFrameRecorded((res: any) => {
      })
    }
  }

  async start(options: VoiceRecorderOptions = {}): Promise<void> {
    if (!this.recorder) {
      this.init()
    }

    if (!this.recorder) {
      throw new Error('当前环境不支持录音功能')
    }

    if (this.isRecording) {
      return
    }

    try {
      await this.requestPermission()
    } catch (err) {
      throw new Error('录音权限被拒绝，请在设置中开启麦克风权限')
    }

    const defaultOptions = {
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3' as const
    }

    const finalOptions = { ...defaultOptions, ...options }
    this.recorder.start(finalOptions)
  }

  async stop(): Promise<{ tempFilePath: string; duration: number }> {
    if (!this.recorder || !this.isRecording) {
      throw new Error('当前没有正在进行的录音')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('录音停止超时'))
      }, 5000)

      const onStopHandler = (res: any) => {
        clearTimeout(timeout)
        this.recorder.offStop(onStopHandler)
        const duration = Math.round((Date.now() - this.recordStartTime) / 1000)
        resolve({ tempFilePath: res.tempFilePath, duration })
      }

      this.recorder.onStop(onStopHandler)
      this.recorder.stop()
    })
  }

  cancel(): void {
    if (this.recorder && this.isRecording) {
      this.recorder.stop()
      this.tempFilePath = ''
    }
  }

  async requestPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof uni !== 'undefined' && uni.authorize) {
        uni.authorize({
          scope: 'scope.record',
          success: () => resolve(),
          fail: () => {
            uni.showModal({
              title: '需要录音权限',
              content: '请在设置中开启麦克风权限以使用语音输入功能',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  uni.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.record']) {
                        resolve()
                      } else {
                        reject(new Error('录音权限未开启'))
                      }
                    },
                    fail: () => reject(new Error('无法打开设置页面'))
                  })
                } else {
                  reject(new Error('用户拒绝授权'))
                }
              }
            })
          }
        })
      } else {
        resolve()
      }
    })
  }

  async recognizeVoice(
    tempFilePath: string,
    mockText?: string
  ): Promise<VoiceRecognizeResult> {
    if (mockText) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        text: mockText,
        confidence: 0.95
      }
    }

    try {
      const result = await speechToText(tempFilePath)
      return {
        text: result.text,
        confidence: result.confidence || 0.8
      }
    } catch (err) {
      throw err
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  getRecordDuration(): number {
    if (!this.isRecording) return 0
    return Math.round((Date.now() - this.recordStartTime) / 1000)
  }

  destroy(): void {
    if (this.recorder) {
      this.recorder = null
    }
    this.isRecording = false
    this.tempFilePath = ''
  }
}

export const voiceService = new VoiceService()

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
