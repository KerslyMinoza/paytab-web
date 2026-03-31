import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { computeGroupBalances } from '~/lib/balanceHelper'
import { ForbiddenError, NotFoundError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/groups/$id/balances')({
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
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          expenses: { include: { splits: true } },
        },
      })

      if (!group) {
        throw new NotFoundError('Group')
      }

      const isMember = group.members.some((m) => m.userId === user.id)
      if (!isMember) {
        throw new ForbiddenError('You are not a member of this group')
      }

      const balances = computeGroupBalances(group.expenses)

      const memberBalances = group.members.map((m) => ({
        user: m.user,
        balance: balances[m.userId] || 0,
      }))

      return jsonResponse({ balances: memberBalances })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
