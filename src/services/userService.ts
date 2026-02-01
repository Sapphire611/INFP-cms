import { Prisma, User, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  userType: UserType;
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
  isActive?: boolean;
}

export interface FindUsersQuery {
  search?: string;
  userType?: UserType;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export async function findUsers(
  query: FindUsersQuery = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) {
  const { search, userType, isActive } = query;
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { profileName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (userType) {
    where.userType = userType;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        userType: true,
        profileName: true,
        profilePhone: true,
        profileAvatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      userType: true,
      profileName: true,
      profilePhone: true,
      profileAvatar: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(data: CreateUserRequest) {
  const hashedPassword = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      userType: true,
      profileName: true,
      profilePhone: true,
      profileAvatar: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(id: string, data: UpdateUserRequest) {
  const updateData: any = { ...data };

  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      userType: true,
      profileName: true,
      profilePhone: true,
      profileAvatar: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      userType: true,
      profileName: true,
      profilePhone: true,
      profileAvatar: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function getUserStats() {
  const [totalUsers, activeUsers, adminCount, userCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { userType: 'admin' } }),
    prisma.user.count({ where: { userType: 'user' } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    adminCount,
    userCount,
    inactiveUsers: totalUsers - activeUsers,
  };
}

export async function getUserGrowthStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalCount, last30DaysCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
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
