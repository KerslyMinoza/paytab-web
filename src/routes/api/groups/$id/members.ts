import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, ForbiddenError, NotFoundError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/groups/$id/members')({
  server: {
    handlers: {
  GET: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError('You are not a member of this group')
      }

      const members = await prisma.groupMember.findMany({
        where: { groupId: id },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      })

      return jsonResponse({ members })
    } catch (err) {
      return errorResponse(err)
    }
  },

  POST: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params
      const body = await parseBody<{ userIds: string[] }>(request)

      if (!body.userIds || body.userIds.length === 0) {
        throw new AppError('userIds is required and must not be empty', 400)
      }

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError('You are not a member of this group')
      }

      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: user.id, addresseeId: { in: body.userIds } },
            { addresseeId: user.id, requesterId: { in: body.userIds } },
          ],
        },
      })

      const friendIds = new Set(
        friendships.map((f) =>
          f.requesterId === user.id ? f.addresseeId : f.requesterId,
        ),
      )

      const nonFriends = body.userIds.filter((uid) => !friendIds.has(uid))
      if (nonFriends.length > 0) {
        throw new AppError(
          `The following users are not your friends: ${nonFriends.join(', ')}`,
          400,
        )
      }

      await prisma.groupMember.createMany({
        data: body.userIds.map((userId) => ({
          groupId: id,
          userId,
          role: 'MEMBER' as const,
        })),
        skipDuplicates: true,
      })

      const members = await prisma.groupMember.findMany({
        where: { groupId: id },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      })

      return jsonResponse({ members }, 201)
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
