/** 服务端同步的全员置顶项 */
export interface EveryonePin {
  messageId: string;
  pinnedByUserId: string;
  pinnedByUsername: string;
  createdAt: string;
}
