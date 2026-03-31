import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, NotFoundError, ForbiddenError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/friends/invite_/$friendshipId/groups')({
  server: {
    handlers: {
  POST: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { friendshipId } = params

      const body = await parseBody<{ groupIds?: string[] }>(request)
      const { groupIds } = body

      if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
        throw new AppError('groupIds is required and must be a non-empty array', 400)
      }

      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
      })

      if (!friendship) {
        throw new NotFoundError('Friendship')
      }

      if (friendship.userId !== user.id) {
        throw new ForbiddenError('This friendship does not belong to you')
      }

      if (friendship.status !== 'PENDING_INVITE') {
        throw new AppError('Friendship is not in pending invite status', 400)
      }

      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id, groupId: { in: groupIds } },
        select: { groupId: true },
      })

      const memberGroupIds = new Set(memberships.map((m) => m.groupId))
      const invalidGroups = groupIds.filter((gid) => !memberGroupIds.has(gid))

      if (invalidGroups.length > 0) {
        throw new ForbiddenError(
          `You are not a member of groups: ${invalidGroups.join(', ')}`,
        )
      }

      await prisma.pendingGroupMember.createMany({
        data: groupIds.map((groupId) => ({
          friendshipId,
          groupId,
        })),
        skipDuplicates: true,
      })

      return jsonResponse({
        message: `Added ${groupIds.length} group(s) to pending invite`,
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
