import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { AppError } from '~/lib/errors'
import { signAccessToken, signRefreshToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'

const REFRESH_TOKEN_DAYS = 7

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
  })
}

export const Route = createFileRoute('/api/auth/verify-email')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await parseBody<{ token?: string }>(request)
      const { token } = body

      if (!token) {
        throw new AppError('Verification token is required', 400)
      }

      const verification = await prisma.emailVerification.findUnique({
        where: { token },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
      })

      if (!verification) {
        throw new AppError('Invalid or expired verification token', 400)
      }

      await prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      })

      await prisma.emailVerification.deleteMany({
        where: { userId: verification.userId },
      })

      await processPendingInvites(verification.user.id, verification.user.email)

      const accessToken = signAccessToken(verification.user.id)
      const refreshTokenValue = signRefreshToken(verification.user.id)

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenValue,
          userId: verification.user.id,
          expiresAt: new Date(
            Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      })

      return jsonResponse({
        user: verification.user,
        accessToken,
        refreshToken: refreshTokenValue,
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
