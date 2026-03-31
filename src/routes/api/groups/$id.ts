import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, ForbiddenError, NotFoundError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/groups/$id')({
  server: {
    handlers: {
  GET: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const group = await prisma.group.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      })

      if (!group) {
        throw new NotFoundError('Group')
      }

      const isMember = group.members.some((m) => m.userId === user.id)
      if (!isMember) {
        throw new ForbiddenError('You are not a member of this group')
      }

      return jsonResponse({ group })
    } catch (err) {
      return errorResponse(err)
    }
  },

  PUT: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params
      const body = await parseBody<{ name?: string; imageUrl?: string }>(request)

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new NotFoundError('Group')
      }

      if (membership.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can update the group')
      }

      const data: Record<string, string> = {}
      if (body.name !== undefined) data.name = body.name
      if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl

      const group = await prisma.group.update({
        where: { id },
        data,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      })

      return jsonResponse({ group })
    } catch (err) {
      return errorResponse(err)
    }
  },

  DELETE: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new NotFoundError('Group')
      }

      if (membership.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can delete the group')
      }

      await prisma.group.delete({ where: { id } })

      return jsonResponse({ message: 'Group deleted successfully' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
