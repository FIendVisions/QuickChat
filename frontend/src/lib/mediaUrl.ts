import { getApiOrigin } from '@/lib/serverOrigin';

/**
 * 将后端返回的 /uploads/... 转为前端可加载的地址。
 * 浏览器内优先使用同源路径（由 next.config rewrites 代理到后端），局域网其他用户也能正常看图。
 */
export function resolveUploadUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    return p;
  }
  return `${getApiOrigin()}${p}`;
}
