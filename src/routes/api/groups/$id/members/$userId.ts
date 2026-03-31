import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { ForbiddenError, NotFoundError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute(
  '/api/groups/$id/members/$userId',
)({
  server: {
    handlers: {
  DELETE: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id, userId } = params

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError('You are not a member of this group')
      }

      const isRemovingSelf = userId === user.id
      const isAdmin = membership.role === 'ADMIN'

      if (!isRemovingSelf && !isAdmin) {
        throw new ForbiddenError('Only admins can remove other members')
      }

      const targetMembership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } },
      })

      if (!targetMembership) {
        throw new NotFoundError('Group member')
      }

      await prisma.groupMember.delete({
        where: { groupId_userId: { groupId: id, userId } },
      })

      return jsonResponse({ message: 'Member removed successfully' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
