import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { User, UserType } from '@prisma/client';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  candidatePassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, hashedPassword);
}

export async function validateCredentials(email: string, password: string): Promise<Partial<User> | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      userType: true,
      isActive: true,
      profileName: true,
      username: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
