import type { Socket } from 'socket.io-client';

/**
 * Socket.IO ack-based request/response for mediasoup SFU signaling.
 *
 * Server handlers return either:
 *   { ok: true, data: ... }
 *   { ok: false, error: '...' }
 *   or raw data (e.g. RTP capabilities)
 */
export function sfuRequest<T = any>(
  socket: Socket,
  event: string,
  payload?: Record<string, any>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`SFU timeout: ${event}`)),
      15_000,
    );

    const cb = (response: any) => {
      clearTimeout(timer);
      if (response?.ok === false) {
        reject(new Error(response.error || `SFU error: ${event}`));
      } else if (response?.data !== undefined) {
        resolve(response.data as T);
      } else {
        resolve(response as T);
      }
    };

    if (payload !== undefined) {
      socket.emit(event, payload, cb);
    } else {
      socket.emit(event, cb);
    }
  });
}
