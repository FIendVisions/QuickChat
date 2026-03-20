/**
 * 后端 HTTP / WebSocket 根地址（无尾斜杠）。
 *
 * - 未配置 NEXT_PUBLIC_API_URL 时：在浏览器内使用「当前页面 hostname + 后端端口」，
 *   这样用手机/另一台电脑访问 http://192.168.x.x:3000 时，API 会打到 192.168.x.x:3001，
 *   而不会错误地请求各设备自己的 localhost。
 * - 配置了 NEXT_PUBLIC_API_URL 时：始终用环境变量（适合固定域名部署）。
 */
const DEFAULT_API_PORT = '3001';

export function getApiOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = process.env.NEXT_PUBLIC_API_PORT || DEFAULT_API_PORT;
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `http://localhost:${DEFAULT_API_PORT}`;
}

/** Socket.IO 使用 http(s) 根地址即可 */
export function getWsOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return getApiOrigin();
}
