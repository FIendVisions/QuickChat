// frontend/src/hooks/useAudioLevel.ts

/**
 * 音频级别 Hook
 * 监听音频流并实时更新音量级别
 */
import { useEffect, useState, useCallback, useRef } from 'react';

interface UseAudioLevelOptions {
  stream: MediaStream | null;
  interval?: number; // 分析间隔（ms），默认 100
}

interface AudioLevelState {
  volume: number; // 当前音量 (dB)
  percentage: number; // 当前音量百分比 (0-100)
  isAboveThreshold: boolean; // 是否超过阈值
}

export function useAudioLevel({ stream, interval = 100 }: UseAudioLevelOptions): AudioLevelState {
  const [audioLevel, setAudioLevel] = useState<AudioLevelState>({
    volume: -Infinity,
    percentage: 0,
    isAboveThreshold: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  /**
   * 初始化音频分析
   */
  const initialize = useCallback(async () => {
    if (!stream || audioContextRef.current) {
      return;
    }

    try {
      // 创建 AudioContext
      audioContextRef.current = new AudioContext({
        sampleRate: 48000,
      });

      // 创建分析器
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // 创建音频源
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // 开始分析
      intervalRef.current = window.setInterval(() => {
        analyze();
      }, interval);
    } catch (error) {
      console.error('Failed to initialize audio level:', error);
    }
  }, [stream, interval]);

  /**
   * 分析音频
   */
  const analyze = useCallback(() => {
    if (!analyserRef.current) {
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // 计算平均音量
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // 转换为分贝
    const volumeDb = (average / 255) * 80 - 90;
    const percentage = Math.max(0, Math.min(100, (volumeDb + 90) * (100 / 80)));

    setAudioLevel({
      volume: volumeDb,
      percentage,
      isAboveThreshold: volumeDb > -30, // 阈值 -30dB
    });
  }, []);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // 自动初始化和清理
  useEffect(() => {
    if (stream) {
      initialize();
    }

    return cleanup;
  }, [stream, initialize, cleanup]);

  return audioLevel;
}
