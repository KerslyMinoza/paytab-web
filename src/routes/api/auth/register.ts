import { createFileRoute } from '@tanstack/react-router';
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils';
import { AppError, ConflictError } from '~/lib/errors';
import { signAccessToken, signRefreshToken } from '~/lib/jwt';
import prisma from '~/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
const REFRESH_TOKEN_DAYS = 7;

async function processPendingInvites(
  userId: string,
  email: string,
): Promise<void> {
  await prisma.friendship.updateMany({
    where: {
      friendEmail: email.toLowerCase(),
      status: 'PENDING_INVITE',
      friendId: null,
    },
    data: { friendId: userId },
  });
}

async function acceptInviteFriendship(
  friendshipId: string,
  newUserId: string,
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: { pendingGroups: true },
  });
  if (!friendship) return;

  await prisma.$transaction([
    prisma.friendship.update({
      where: { id: friendshipId },
      data: { friendId: newUserId, status: 'ACCEPTED' },
    }),
    prisma.friendship.create({
      data: {
        userId: newUserId,
        friendId: friendship.userId,
        status: 'ACCEPTED',
      },
    }),
    ...friendship.pendingGroups.map((pg: { groupId: string }) =>
      prisma.groupMember.create({
        data: { groupId: pg.groupId, userId: newUserId, role: 'MEMBER' },
      }),
    ),
    prisma.pendingGroupMember.deleteMany({ where: { friendshipId } }),
  ]);
}

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody<{
            email?: string;
            password?: string;
            name?: string;
            inviteToken?: string;
          }>(request);

          const { email, password, name, inviteToken } = body;

          if (!email || !password) {
            throw new AppError('Email and password are required', 400);
          }

          const emailLower = email.toLowerCase().trim();

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
            throw new AppError('Invalid email format', 400);
          }

          if (password.length < 8 || password.length > 128) {
            throw new AppError(
              'Password must be between 8 and 128 characters',
              400,
            );
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: emailLower },
          });
          if (existingUser) {
            throw new ConflictError(
              'An account with this email already exists',
            );
          }

          const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

          if (inviteToken) {
            const invite = await prisma.inviteToken.findUnique({
              where: { token: inviteToken },
              include: { friendship: true },
            });

            if (!invite) {
              throw new AppError('Invalid invite token', 400);
            }
            if (invite.usedAt) {
              throw new AppError('Invite token has already been used', 400);
            }
            if (invite.expiresAt < new Date()) {
              throw new AppError('Invite token has expired', 400);
            }

            const user = await prisma.user.create({
              data: {
                email: emailLower,
                passwordHash,
                name: name || null,
                emailVerified: true,
              },
              select: { id: true, email: true, name: true, avatarUrl: true },
            });

            await prisma.inviteToken.update({
              where: { id: invite.id },
              data: { usedAt: new Date() },
            });

            await acceptInviteFriendship(invite.friendshipId, user.id);
            await processPendingInvites(user.id, emailLower);

            const accessToken = signAccessToken(user.id);
            const refreshTokenValue = signRefreshToken(user.id);

            await prisma.refreshToken.create({
              data: {
                token: refreshTokenValue,
                userId: user.id,
                expiresAt: new Date(
                  Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
                ),
              },
            });

            return jsonResponse(
              { user, accessToken, refreshToken: refreshTokenValue },
              201,
            );
          }

          const user = await prisma.user.create({
            data: {
              email: emailLower,
              passwordHash,
              name: name || null,
              emailVerified: false,
            },
            select: { id: true, email: true, name: true, avatarUrl: true },
          });

          const verificationToken = crypto.randomBytes(32).toString('hex');
          await prisma.emailVerification.create({
            data: {
              token: verificationToken,
              userId: user.id,
            },
          });

          return jsonResponse(
            {
              message:
                'Registration successful. Please check your email to verify your account.',
            },
            201,
          );
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
