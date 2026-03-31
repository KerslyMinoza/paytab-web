import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { AppError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/auth/accept-invite')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await parseBody<{ token?: string }>(request)
      const { token } = body

      if (!token) {
        throw new AppError('Invite token is required', 400)
      }

      const invite = await prisma.inviteToken.findUnique({
        where: { token },
        include: {
          friendship: {
            include: {
              user: {
                select: { name: true, avatarUrl: true },
              },
            },
          },
        },
      })

      if (!invite) {
        throw new AppError('Invalid invite token', 400)
      }

      if (invite.usedAt) {
        throw new AppError('Invite token has already been used', 400)
      }

      if (invite.expiresAt < new Date()) {
        throw new AppError('Invite token has expired', 400)
      }

      return jsonResponse({
        valid: true,
        email: invite.email,
        inviterName: invite.friendship.user?.name || null,
        inviterAvatarUrl: invite.friendship.user?.avatarUrl || null,
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
