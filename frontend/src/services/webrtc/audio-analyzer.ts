// frontend/src/services/webrtc/audio-analyzer.ts

/**
 * 音频分析器
 * 使用 Web Audio API 分析音频流，计算音量和频率
 */
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isInitialized = false;

  /**
   * 初始化音频分析器
   */
  async initialize(stream: MediaStream): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.stream = stream;

      // 创建 AudioContext
      this.audioContext = new AudioContext({
        sampleRate: 48000,
      });

      // 创建分析器
      this.analyser = this.audioContext.createAnalyser();

      // 配置分析器参数
      this.analyser.fftSize = 256; // 频率箱大小
      this.analyser.smoothingTimeConstant = 0.8; // 平滑时间常数
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // 创建音频源
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // 分配数据数组
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  }

  /**
   * 获取当前音量（分贝）
   */
  getVolume(): number {
    if (!this.analyser || !this.dataArray) {
      return -Infinity; // 静音
    }

    try {
      // 获取频率数据
      this.analyser.getByteFrequencyData(this.dataArray);

      // 计算平均值
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / this.dataArray.length;

      // 转换为分贝（0-255 -> -90dB 到 -10dB）
      const volumeDb = (average / 255) * 80 - 90;

      return volumeDb;
    } catch (error) {
      console.error('Failed to get volume:', error);
      return -Infinity;
    }
  }

  /**
   * 获取音量百分比（0-100）
   */
  getVolumePercentage(): number {
    const volumeDb = this.getVolume();

    // 映射到 0-100
    // -90dB -> 0%, -10dB -> 100%
    const percentage = Math.max(0, Math.min(100, (volumeDb + 90) * (100 / 80)));

    return percentage;
  }

  /**
   * 获取频率数据（用于可视化）
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.dataArray) {
      return new Uint8Array(0);
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * 获取时域数据（用于波形显示）
   */
  getTimeDomainData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);
    return timeData;
  }

  /**
   * 开始持续分析
   */
  startAnalysis(callback: (volume: number, percentage: number) => void, interval: number = 100): void {
    if (!this.isInitialized) {
      console.warn('Audio analyzer not initialized');
      return;
    }

    const intervalId = setInterval(() => {
      const volume = this.getVolume();
      const percentage = this.getVolumePercentage();
      callback(volume, percentage);
    }, interval);

    // 保存 intervalId 以便停止
    (this as any).analysisIntervalId = intervalId;
  }

  /**
   * 停止持续分析
   */
  stopAnalysis(): void {
    if ((this as any).analysisIntervalId) {
      clearInterval((this as any).analysisIntervalId);
      delete (this as any).analysisIntervalId;
    }
  }

  /**
   * 检查是否已初始化
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.stopAnalysis();

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
    this.isInitialized = false;
  }
}
