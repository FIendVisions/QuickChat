import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';

/** 登录失败统一文案，避免用户名枚举（OWASP） */
const LOGIN_FAILED_MSG = '用户名或密码错误';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeUsername(raw: string): string {
    return raw.trim().toLowerCase();
  }

  private normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  async register(dto: RegisterDto) {
    const username = this.normalizeUsername(dto.username);
    const email = this.normalizeEmail(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          password: passwordHash,
          status: 'OFFLINE',
          role: 'USER',
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });

      const access_token = await this.signToken(user.id, user.username);

      return {
        access_token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email ?? undefined,
        },
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        this.logger.warn(`Register conflict: ${username}`);
        throw new BadRequestException('注册无法完成，用户名或邮箱可能已被使用');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const username = this.normalizeUsername(dto.username);

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, password: true },
    });

    if (!user?.password) {
      throw new UnauthorizedException(LOGIN_FAILED_MSG);
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      throw new UnauthorizedException(LOGIN_FAILED_MSG);
    }

    const access_token = await this.signToken(user.id, user.username);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? undefined,
      },
    };
  }

  private async signToken(userId: string, username: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      username,
    });
  }
}
