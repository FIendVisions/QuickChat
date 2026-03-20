import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChannelKind } from '../../common/types';

@Injectable()
export class ChannelForumService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertForumChannelMember(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, kind: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.kind !== ChannelKind.FORUM) {
      throw new BadRequestException('Not a forum channel');
    }
    const m = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!m) throw new ForbiddenException('You are not a member of this channel');
  }

  async listPosts(channelId: string, userId: string, q?: string) {
    await this.assertForumChannelMember(channelId, userId);
    const query = q?.trim();
    const posts = await this.prisma.forumPost.findMany({
      where: {
        channelId,
        ...(query ? { title: { contains: query } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
    return {
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
      })),
    };
  }

  async createPost(channelId: string, userId: string, title: string, content: string) {
    await this.assertForumChannelMember(channelId, userId);
    if (!title?.trim()) throw new BadRequestException('Title required');
    if (title.length > 200) throw new BadRequestException('Title too long');
    if (content.length > 50000) throw new BadRequestException('Content too long');
    const post = await this.prisma.forumPost.create({
      data: {
        channelId,
        authorId: userId,
        title: title.trim(),
        content: content || '',
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
    return {
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
      },
    };
  }

  async getPostDetail(channelId: string, postId: string, userId: string) {
    await this.assertForumChannelMember(channelId, userId);
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, channelId },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const likedByMe = post.likes.length > 0;
    return {
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likedByMe,
        comments: post.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: c.user,
        })),
      },
    };
  }

  async addComment(channelId: string, postId: string, userId: string, content: string) {
    await this.assertForumChannelMember(channelId, userId);
    if (!content?.trim()) throw new BadRequestException('Content required');
    if (content.length > 4000) throw new BadRequestException('Comment too long');
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, channelId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    const c = await this.prisma.forumPostComment.create({
      data: { postId, userId, content: content.trim() },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
    return {
      comment: {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: c.user,
      },
    };
  }

  async updatePost(
    channelId: string,
    postId: string,
    userId: string,
    dto: { title?: string; content?: string },
  ) {
    await this.assertForumChannelMember(channelId, userId);
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('At least one of title or content is required');
    }
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, channelId },
      select: {
        id: true,
        authorId: true,
        channel: { select: { ownerId: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const canEdit =
      post.authorId === userId || post.channel.ownerId === userId;
    if (!canEdit) {
      throw new ForbiddenException('Only author or channel owner can edit');
    }
    if (dto.title !== undefined) {
      if (!dto.title.trim()) throw new BadRequestException('Title cannot be empty');
      if (dto.title.length > 200) throw new BadRequestException('Title too long');
    }
    if (dto.content !== undefined && dto.content.length > 50000) {
      throw new BadRequestException('Content too long');
    }
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
    return this.getPostDetail(channelId, postId, userId);
  }

  async toggleLike(channelId: string, postId: string, userId: string) {
    await this.assertForumChannelMember(channelId, userId);
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, channelId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.forumPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    let liked: boolean;
    if (existing) {
      await this.prisma.forumPostLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await this.prisma.forumPostLike.create({ data: { postId, userId } });
      liked = true;
    }
    const likeCount = await this.prisma.forumPostLike.count({ where: { postId } });
    return { liked, likeCount };
  }
}
