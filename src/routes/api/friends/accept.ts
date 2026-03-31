import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, NotFoundError, ForbiddenError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/friends/accept')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const body = await parseBody<{ friendshipId?: string }>(request)
      const { friendshipId } = body

      if (!friendshipId) {
        throw new AppError('friendshipId is required', 400)
      }

      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
        include: { pendingGroups: true },
      })

      if (!friendship) {
        throw new NotFoundError('Friendship')
      }

      if (friendship.friendId !== user.id) {
        throw new ForbiddenError('You are not the recipient of this friend request')
      }

      if (friendship.status !== 'PENDING_INVITE') {
        throw new AppError('This request is not pending', 400)
      }

      await prisma.$transaction([
        prisma.friendship.update({
          where: { id: friendshipId },
          data: { status: 'ACCEPTED' },
        }),
        prisma.friendship.create({
          data: {
            userId: user.id,
            friendId: friendship.userId,
            status: 'ACCEPTED',
          },
        }),
        ...friendship.pendingGroups.map((pg) =>
          prisma.groupMember.create({
            data: {
              groupId: pg.groupId,
              userId: user.id,
              role: 'MEMBER',
            },
          }),
        ),
        prisma.pendingGroupMember.deleteMany({
          where: { friendshipId },
        }),
      ])

      return jsonResponse({ message: 'Friend request accepted' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
