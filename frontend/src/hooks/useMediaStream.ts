// frontend/src/hooks/useMediaStream.ts

/**
 * 媒体流 Hook
 * 管理麦克风的获取、释放和控制
 */
import { useState, useCallback, useRef } from 'react';

interface UseMediaStreamOptions {
  audio?: boolean;
  video?: boolean;
}

interface MediaStreamControls {
  stream: MediaStream | null;
  isRequesting: boolean;
  requestStream: () => Promise<void>;
  releaseStream: () => void;
  toggleTrack: (kind: 'audio' | 'video') => void;
  getTrack: (kind: 'audio' | 'video') => MediaStreamTrack | null;
}

export function useMediaStream(options: UseMediaStreamOptions = { audio: true, video: false }): MediaStreamControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);

  /**
   * 请求媒体流
   */
  const requestStream = useCallback(async () => {
    if (streamRef.current) {
      console.warn('Media stream already exists');
      return;
    }

    setIsRequesting(true);

    try {
      const constraints: MediaStreamConstraints = {};

      if (options.audio) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        };
      }

      if (options.video) {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (error) {
      console.error('Failed to get media stream:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [options.audio, options.video]);

  /**
   * 释放媒体流
   */
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      // 停止所有轨道
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });

      streamRef.current = null;
      setStream(null);
    }
  }, []);

  /**
   * 切换轨道（启用/禁用）
   */
  const toggleTrack = useCallback((kind: 'audio' | 'video') => {
    if (!streamRef.current) {
      return;
    }

    const tracks = streamRef.current.getTracks();
    const track = tracks.find(t => t.kind === kind);

    if (track) {
      track.enabled = !track.enabled;
      console.log(`${kind} track ${track.enabled ? 'enabled' : 'disabled'}`);
    }
  }, []);

  /**
   * 获取指定类型的轨道
   */
  const getTrack = useCallback((kind: 'audio' | 'video') => {
    if (!streamRef.current) {
      return null;
    }

    const tracks = streamRef.current.getTracks();
    return tracks.find(t => t.kind === kind) || null;
  }, []);

  return {
    stream,
    isRequesting,
    requestStream,
    releaseStream,
    toggleTrack,
    getTrack,
  };
}
