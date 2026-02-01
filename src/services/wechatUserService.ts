import { Prisma, WechatUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface CreateWechatUserRequest {
  profileName: string;
  profilePhone?: string;
  profileAvatar?: string;
  profileIdNumber?: string;
  openid?: string;
  unionid?: string;
  wechatNickname?: string;
  wechatAvatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateWechatUserRequest {
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
  profileIdNumber?: string;
  openid?: string;
  unionid?: string;
  wechatNickname?: string;
  wechatAvatarUrl?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface FindWechatUsersQuery {
  search?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export async function findWechatUsers(
  query: FindWechatUsersQuery = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) {
  const { search, isActive } = query;
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Prisma.WechatUserWhereInput = {};

  if (search) {
    where.OR = [
      { profileName: { contains: search, mode: 'insensitive' } },
      { profilePhone: { contains: search, mode: 'insensitive' } },
      { wechatNickname: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [wechatUsers, total] = await Promise.all([
    prisma.wechatUser.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.wechatUser.count({ where }),
  ]);

  return {
    wechatUsers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function findWechatUserById(id: string) {
  return prisma.wechatUser.findUnique({
    where: { id },
  });
}

export async function createWechatUser(data: CreateWechatUserRequest) {
  return prisma.wechatUser.create({
    data,
  });
}

export async function updateWechatUser(id: string, data: UpdateWechatUserRequest) {
  return prisma.wechatUser.update({
    where: { id },
    data,
  });
}

export async function deleteWechatUser(id: string) {
  return prisma.wechatUser.delete({
    where: { id },
  });
}

export async function findByOpenid(openid: string) {
  return prisma.wechatUser.findUnique({
    where: { openid },
  });
}

export async function findByUnionid(unionid: string) {
  return prisma.wechatUser.findUnique({
    where: { unionid },
  });
}

export async function updateLastLogin(id: string) {
  return prisma.wechatUser.update({
    where: { id },
    data: {
      lastLoginAt: new Date(),
    },
  });
}

export async function getWechatUserStats() {
  const [totalWechatUsers, activeWechatUsers, wechatLoginCount] = await Promise.all([
    prisma.wechatUser.count(),
    prisma.wechatUser.count({ where: { isActive: true } }),
    prisma.wechatUser.count({
      where: {
        openid: { not: null },
        lastLoginAt: { not: null },
      },
    }),
  ]);

  return {
    totalWechatUsers,
    activeWechatUsers,
    wechatLoginCount,
    inactiveWechatUsers: totalWechatUsers - activeWechatUsers,
  };
}

export async function getWechatUserGrowthStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalCount, last30DaysCount] = await Promise.all([
    prisma.wechatUser.count(),
    prisma.wechatUser.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
  ]);

  return {
    total: totalCount,
    growth: last30DaysCount,
    growthRate: totalCount > 0 ? ((last30DaysCount / totalCount) * 100).toFixed(2) : '0.00',
  };
}
