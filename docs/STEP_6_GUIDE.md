# 步骤 6：说话指示器逻辑 - 技术文档

## 概述

步骤 6 实现了完整的说话检测系统，使用 Web Audio API 分析音频流，智能检测用户是否在说话，并提供实时音量可视化。

---

## 核心组件

### 1. AudioAnalyzer (音频分析器)

**文件:** `frontend/src/services/webrtc/audio-analyzer.ts`

**功能:**
- ✅ Web Audio API 集成
- ✅ 音量计算（分贝和百分比）
- ✅ 频域和时域数据提取
- ✅ 麦克风流分析

**核心算法:**

```typescript
// 计算音量（分贝）
getVolume(): number {
  if (!this.ready) return -Infinity;

  const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  this.analyser.getByteFrequencyData(dataArray);

  // 计算 RMS（均方根）
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);

  // 转换为分贝 (-90dB ~ -10dB)
  return (rms / 255) * 80 - 90;
}

// 计算音量百分比 (0-100)
getVolumePercentage(): number {
  const volume = this.getVolume();
  return Math.max(0, Math.min(100, (volume + 90) * (100 / 80)));
}
```

**使用示例:**

```typescript
const analyzer = new AudioAnalyzer();
await analyzer.initialize(mediaStream);

// 获取当前音量
const volumeDb = analyzer.getVolume();        // -45 dB
const percentage = analyzer.getVolumePercentage(); // 56%

// 获取频域数据（用于可视化）
const frequencyData = analyzer.getFrequencyData();
const timeDomainData = analyzer.getTimeDomainData();

// 清理资源
analyzer.destroy();
```

---

### 2. SpeakingDetector (说话检测器)

**文件:** `frontend/src/services/webrtc/speaking-detector.ts`

**功能:**
- ✅ 智能说话检测
- ✅ 防抖动算法
- ✅ 可配置阈值和延迟
- ✅ 回调事件

**检测算法:**

```typescript
private analyze(): void {
  const now = Date.now();
  const volume = this.analyzer.getVolume();

  if (volume > this.options.threshold) {
    // 音量超过阈值
    this.lastSpeakingTime = now;

    if (!this.isSpeaking) {
      // 检查是否持续超过防抖时间（200ms）
      if (now - this.lastSilentTime > this.options.debounce) {
        this.setSpeaking(true);  // 开始说话
      }
    }
  } else {
    // 音量低于阈值
    this.lastSilentTime = now;

    if (this.isSpeaking) {
      // 检查是否持续静音超过延迟时间（500ms）
      if (now - this.lastSpeakingTime > this.options.silenceDelay) {
        this.setSpeaking(false);  // 停止说话
      }
    }
  }
}
```

**配置参数:**

```typescript
interface SpeakingDetectorOptions {
  threshold?: number;      // 说话阈值 (dB)，默认 -30
  debounce?: number;       // 开启防抖延迟 (ms)，默认 200
  silenceDelay?: number;   // 关闭延迟 (ms)，默认 500
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
}
```

**使用示例:**

```typescript
const detector = new SpeakingDetector(audioAnalyzer, {
  threshold: -30,        // -30dB 以上视为说话
  debounce: 200,         // 持续 200ms 才标记为说话
  silenceDelay: 500,     // 静音 500ms 后标记为停止
  onSpeakingStart: () => {
    console.log('开始说话');
    emit('speaking_state_change', { isSpeaking: true });
  },
  onSpeakingEnd: () => {
    console.log('停止说话');
    emit('speaking_state_change', { isSpeaking: false });
  },
});

detector.start();  // 开始检测

// 获取当前状态
const isSpeaking = detector.isCurrentlySpeaking();
const volume = detector.getVolume();  // 当前音量 dB
const percentage = detector.getVolumePercentage();  // 0-100

detector.stop();   // 停止检测
detector.destroy(); // 销毁
```

---

### 3. useMediaStream (媒体流 Hook)

**文件:** `frontend/src/hooks/useMediaStream.ts`

**功能:**
- ✅ 请求麦克风权限
- ✅ 管理媒体流生命周期
- ✅ 音频轨道启用/禁用
- ✅ 自动清理资源

**音频约束:**

```typescript
const constraints = {
  audio: {
    echoCancellation: true,    // 回声消除
    noiseSuppression: true,    // 噪音抑制
    autoGainControl: true,     // 自动增益
    sampleRate: 48000,         // 采样率 48kHz
    channelCount: 1,           // 单声道
  },
};
```

**使用示例:**

```typescript
const {
  stream,
  isRequesting,
  requestStream,
  releaseStream,
  toggleTrack,
  getTrack,
} = useMediaStream({ audio: true, video: false });

// 请求麦克风
await requestStream();

// 禁用音频轨道（静音）
toggleTrack('audio');

// 获取音频轨道
const audioTrack = getTrack('audio');
if (audioTrack) {
  audioTrack.enabled = false;
}

// 释放流
releaseStream();
```

---

### 4. useAudioLevel (音量级别 Hook)

**文件:** `frontend/src/hooks/useAudioLevel.ts`

**功能:**
- ✅ 实时音量监控
- ✅ 返回 dB 和百分比
- ✅ 阈值检测

**使用示例:**

```typescript
const { volume, percentage, isAboveThreshold } = useAudioLevel({
  stream: mediaStream,
  interval: 100,  // 每 100ms 更新一次
});

// 使用音量数据
<div>
  <p>音量: {volume.toFixed(1)} dB</p>
  <p>百分比: {percentage.toFixed(0)}%</p>
  {isAboveThreshold && <p>正在说话 🎤</p>}
</div>
```

---

### 5. useVoiceEnhanced (增强版语音 Hook)

**文件:** `frontend/src/hooks/useVoiceEnhanced.ts`

**功能:**
- ✅ 集成 AudioAnalyzer 和 SpeakingDetector
- ✅ 自动校准阈值
- ✅ 说话事件限流
- ✅ 完整的资源清理

**自动校准算法:**

```typescript
const calibrateThreshold = async (duration: number = 3000) => {
  const noiseSamples: number[] = [];

  // 采集 3 秒环境噪音
  while (Date.now() - startTime < duration) {
    const volume = audioAnalyzerRef.current.getVolume();
    noiseSamples.push(volume);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // 计算噪音底
  const mean = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;
  const variance = noiseSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / noiseSamples.length;
  const stdDev = Math.sqrt(variance);

  // 阈值 = 噪音底 + 标准差 + 15dB
  const threshold = mean + stdDev + 15;

  return threshold;
};
```

**事件限流:**

```typescript
const notifySpeakingState = (isSpeaking: boolean) => {
  const now = Date.now();

  // 限流：最多每 100ms 发送一次
  if (now - lastSpeakingEventRef.current < 100) {
    return;
  }

  emit('speaking_state_change', {
    isSpeaking,
    volume: audioAnalyzerRef.current?.getVolumePercentage() || 0,
    timestamp: now,
  });

  lastSpeakingEventRef.current = now;
};
```

**使用示例:**

```typescript
const {
  isConnected,
  isMicrophoneOpen,
  isDeafened,
  participants,
  speakingUsers,
  audioLevel,
  joinChannel,
  leaveChannel,
  toggleMicrophone,
  toggleDeafen,
  calibrateMicrophone,
} = useVoiceEnhanced({
  userId: 'user-123',
  token: 'jwt-token',
  channelId: 'channel-456',
  autoJoin: true,       // 自动加入频道
  autoCalibrate: true,  // 自动校准麦克风
});

// 开启麦克风
await toggleMicrophone();

// 手动校准
const threshold = await calibrateMicrophone();
console.log('Calculated threshold:', threshold);

// 退出频道
leaveChannel();
```

---

### 6. VoiceControlsEnhanced (增强版控制组件)

**文件:** `frontend/src/components/voice/VoiceControlsEnhanced.tsx`

**新增功能:**
- ✅ 实时音量条显示
- ✅ 音量百分比显示
- ✅ 校准按钮（带加载状态）
- ✅ 动画效果

**音量可视化:**

```tsx
{/* 音量条 */}
{isMicrophoneOpen && (
  <div className="flex items-center gap-2">
    <Mic size={14} className={audioLevel > 0 ? 'text-success' : 'text-text-muted'} />
    <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
      <div
        className="h-full bg-success transition-all duration-100 ease-out"
        style={{ width: `${audioLevel}%` }}
      />
    </div>
    <span className="text-xs text-text-muted">
      {audioLevel.toFixed(0)}%
    </span>
  </div>
)}
```

**校准按钮:**

```tsx
<button
  onClick={handleCalibrate}
  disabled={!isConnected || calibrating || !isMicrophoneOpen}
  className={`
    flex flex-col items-center justify-center gap-1 p-2 rounded-lg
    transition-all duration-150
    ${calibrating
      ? 'bg-warning text-white animate-pulse'
      : 'bg-bg-secondary text-text-normal hover:bg-bg-tertiary'
    }
  `}
  title="校准麦克风"
>
  <Sliders size={24} />
  <span className="text-xs">{calibrating ? '校准中...' : '校准'}</span>
</button>
```

---

## 工作流程

### 初始化流程

```
1. 用户开启麦克风
   ↓
2. requestStream() - 请求麦克风权限
   ↓
3. AudioAnalyzer.initialize(stream) - 初始化音频分析器
   ↓
4. SpeakingDetector.start() - 开始检测说话
   ↓
5. 每 100ms 分析一次音量
   ↓
6. 音量 > 阈值持续 200ms → 标记为说话
   ↓
7. 发送 WebSocket 事件（限流 100ms）
```

### 说话检测流程

```
┌─────────────────────────────────────────────────┐
│  音量 > -30dB ?                                  │
└─────────────────────────────────────────────────┘
           │
           ├─ 是 ─→ 持续 200ms ? ─→ 是 ─→ 🎤 说话中
           │              │
           │              └─ 否 ─→ 等待
           │
           └─ 否 ─→ 持续 500ms ? ─→ 是 �─→ 🔇 静音
                          │
                          └─ 否 ─→ 等待
```

### 校准流程

```
1. 用户点击"校准"按钮
   ↓
2. 禁用校准按钮，显示"校准中..."
   ↓
3. 采集 3 秒环境噪音（每 50ms 采样一次）
   ↓
4. 计算平均音量（噪音底）
   ↓
5. 计算标准差
   ↓
6. 阈值 = 噪音底 + 标准差 + 15dB
   ↓
7. 更新 SpeakingDetector 阈值
   ↓
8. 显示校准完成提示
```

---

## 性能优化

### 1. 采样频率控制

```typescript
// 音频分析：100ms 间隔
const analysisInterval = 100;

// 说话事件限流：100ms 最小间隔
if (now - lastSpeakingEventTime < 100) {
  return; // 跳过此次发送
}
```

### 2. 资源清理

```typescript
// 组件卸载时清理
useEffect(() => {
  return () => {
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.destroy();
    }
    if (speakingDetectorRef.current) {
      speakingDetectorRef.current.destroy();
    }
    if (stream) {
      releaseStream();
    }
  };
}, []);
```

### 3. Web Audio 优化

```typescript
// 使用较小的 fftSize 提高性能
analyser.fftSize = 256;  // 而不是 2048

// 平滑处理减少抖动
analyser.smoothingTimeConstant = 0.8;
```

---

## 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| getUserMedia | ✅ | ✅ | ✅ | ✅ |
| AudioContext | ✅ | ✅ | ✅ | ✅ |
| AnalyserNode | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ 53+ | ✅ 53+ | ✅ 14+ | ✅ 79+ |

**权限要求:**
- 麦克风访问权限
- HTTPS（或 localhost）

---

## 调试技巧

### 查看音量级别

```typescript
// 每 100ms 打印音量
setInterval(() => {
  const volume = audioAnalyzer.getVolume();
  const percentage = audioAnalyzer.getVolumePercentage();
  console.log(`Volume: ${volume.toFixed(2)}dB (${percentage.toFixed(0)}%)`);
}, 100);
```

### 测试说话检测

```typescript
const detector = new SpeakingDetector(analyzer, {
  threshold: -30,
  debounce: 200,
  silenceDelay: 500,
  onSpeakingStart: () => console.log('🎤 START'),
  onSpeakingEnd: () => console.log('🔇 END'),
});
```

### 手动设置阈值

```typescript
// 跳过校准，直接设置阈值
const detector = new SpeakingDetector(analyzer, {
  threshold: -25,  // 更灵敏
  debounce: 100,   // 更快响应
  silenceDelay: 300,
  // ...
});
```

---

## 常见问题

### 1. 说话检测不灵敏

**原因:** 阈值设置过高

**解决:**
```typescript
// 方法 1: 使用校准功能
await calibrateMicrophone();

// 方法 2: 手动降低阈值
detector.options.threshold = -25;  // 从 -30 改为 -25
```

### 2. 误检测（环境噪音）

**原因:** 阈值设置过低或环境噪音大

**解决:**
```typescript
// 1. 运行校准
await calibrateMicrophone();

// 2. 增加防抖时间
detector.options.debounce = 500;  // 从 200 增加到 500
```

### 3. 说话状态闪烁

**原因:** 防抖延迟不足

**解决:**
```typescript
detector.options.debounce = 300;      // 增加开启延迟
detector.options.silenceDelay = 800;  // 增加关闭延迟
```

### 4. 内存泄漏

**原因:** 未清理资源

**解决:**
```typescript
// 确保在组件卸载时清理
useEffect(() => {
  return () => {
    audioAnalyzer.destroy();
    speakingDetector.destroy();
  };
}, []);
```

---

## 文件清单

```
frontend/src/
├── services/
│   └── webrtc/
│       ├── audio-analyzer.ts           [新增]
│       └── speaking-detector.ts        [新增]
├── hooks/
│   ├── useMediaStream.ts               [新增]
│   ├── useAudioLevel.ts                [新增]
│   └── useVoiceEnhanced.ts             [新增]
└── components/
    └── voice/
        └── VoiceControlsEnhanced.tsx   [更新]
```

---

## 下一步

步骤 6 已完成说话检测的基础逻辑。可以继续优化：

1. **可视化增强** - 频谱图、波形图
2. **多麦克风支持** - 设备选择
3. **噪音抑制** - 更高级的音频处理
4. **回声消除** - AEC（Acoustic Echo Cancellation）
5. **自动增益** - AGC（Automatic Gain Control）
