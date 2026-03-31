import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { computeGroupBalances } from '~/lib/balanceHelper'
import { AppError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/groups/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const groups = await prisma.group.findMany({
        where: { members: { some: { userId: user.id } } },
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
        orderBy: { updatedAt: 'desc' },
      })

      const result = groups.map((group) => {
        const balances = computeGroupBalances(group.expenses)
        const myBalance = balances[user.id] || 0
        return {
          id: group.id,
          name: group.name,
          imageUrl: group.imageUrl,
          members: group.members.map((m) => m.user),
          balance: myBalance,
          balanceLabel: myBalance >= 0 ? "You'll receive" : 'You owe',
          createdAt: group.createdAt,
        }
      })

      return jsonResponse({ groups: result })
    } catch (err) {
      return errorResponse(err)
    }
  },

  POST: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)
      const body = await parseBody<{
        name: string
        imageUrl?: string
        memberIds?: string[]
      }>(request)

      if (!body.name || body.name.trim().length === 0) {
        throw new AppError('Group name is required', 400)
      }

      const memberIds = body.memberIds || []
      const uniqueMemberIds = [...new Set(memberIds.filter((id) => id !== user.id))]

      const group = await prisma.group.create({
        data: {
          name: body.name.trim(),
          imageUrl: body.imageUrl || null,
          members: {
            create: [
              { userId: user.id, role: 'ADMIN' },
              ...uniqueMemberIds.map((userId) => ({
                userId,
                role: 'MEMBER' as const,
              })),
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      })

      return jsonResponse({ group }, 201)
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
