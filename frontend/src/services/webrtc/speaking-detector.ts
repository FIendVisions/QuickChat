// frontend/src/services/webrtc/speaking-detector.ts

/**
 * 说话检测器配置
 */
export interface SpeakingDetectorOptions {
  threshold?: number;      // 说话阈值 (dB)，默认 -30
  debounce?: number;       // 开启防抖延迟 (ms)，默认 200
  silenceDelay?: number;   // 关闭延迟 (ms)，默认 500
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
}

/**
 * 说话检测器
 * 检测音频流中是否有用户在说话
 */
export class SpeakingDetector {
  private analyzer: any; // AudioAnalyzer
  private isSpeaking: boolean = false;
  private lastSpeakingTime: number = 0;
  private lastSilentTime: number = 0;
  private intervalId: number | null = null;
  private analysisInterval: number = 100; // 分析间隔 (ms)
  private currentVolume: number = 0;
  private currentPercentage: number = 0;

  constructor(
    audioAnalyzer: any,
    private options: SpeakingDetectorOptions
  ) {
    this.analyzer = audioAnalyzer;

    // 设置默认值
    this.options = {
      threshold: options.threshold || -30,
      debounce: options.debounce || 200,
      silenceDelay: options.silenceDelay || 500,
      onSpeakingStart: options.onSpeakingStart || (() => {}),
      onSpeakingEnd: options.onSpeakingEnd || (() => {}),
    };
  }

  /**
   * 开始检测
   */
  start(): void {
    if (this.intervalId) {
      return; // 已经在运行
    }

    this.intervalId = window.setInterval(() => {
      this.analyze();
    }, this.analysisInterval) as unknown as number;
  }

  /**
   * 停止检测
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 重置状态
    this.isSpeaking = false;
  }

  /**
   * 分析音频
   */
  private analyze(): void {
    if (!this.analyzer.ready) {
      return;
    }

    // 获取当前音量
    this.currentVolume = this.analyzer.getVolume();
    this.currentPercentage = this.analyzer.getVolumePercentage();

    const now = Date.now();

    // 检测逻辑
    if (this.currentVolume > this.options.threshold!) {
      // 音量超过阈值
      this.lastSpeakingTime = now;

      if (!this.isSpeaking) {
        // 检查是否持续超过防抖时间
        if (now - this.lastSilentTime > this.options.debounce!) {
          this.setSpeaking(true);
        }
      } else {
        // 已经在说话，更新最后说话时间
        this.lastSpeakingTime = now;
      }
    } else {
      // 音量低于阈值
      this.lastSilentTime = now;

      if (this.isSpeaking) {
        // 检查是否持续静音超过延迟时间
        if (now - this.lastSpeakingTime > this.options.silenceDelay!) {
          this.setSpeaking(false);
        }
      }
    }
  }

  /**
   * 设置说话状态
   */
  private setSpeaking(speaking: boolean): void {
    if (this.isSpeaking === speaking) {
      return;
    }

    this.isSpeaking = speaking;

    if (speaking) {
      this.options.onSpeakingStart();
    } else {
      this.options.onSpeakingEnd();
    }
  }

  /**
   * 获取当前音量（dB）
   */
  getVolume(): number {
    return this.currentVolume;
  }

  /**
   * 获取当前音量百分比（0-100）
   */
  getVolumePercentage(): number {
    return this.currentPercentage;
  }

  /**
   * 检查是否正在说话
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
  }
}
