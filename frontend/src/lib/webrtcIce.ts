/** 等待 ICE 收集结束或超时（提高首包连通率，仍支持后续 trickle） */
export async function waitIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs = 2800,
): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    const timer = window.setTimeout(finish, timeoutMs);
    const onState = () => {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onState);
        finish();
      }
    };
    pc.addEventListener('icegatheringstatechange', onState);
  });
}
