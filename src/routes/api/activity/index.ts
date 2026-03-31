import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, getSearchParams } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/activity/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const { group, cursor, limit = '20' } = Object.fromEntries(getSearchParams(request))
      const take = Math.min(parseInt(limit as string), 50)

      const memberGroups = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      })
      const groupIds = memberGroups.map((m) => m.groupId)

      const where: any = {
        groupId: group ? { equals: group } : { in: groupIds },
      }
      if (cursor) {
        where.createdAt = { lt: new Date(cursor as string) }
      }

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        include: {
          paidBy: { select: { id: true, email: true, name: true, avatarUrl: true } },
          splits: {
            include: {
              user: { select: { id: true, email: true, name: true, avatarUrl: true } },
            },
          },
          group: { select: { id: true, name: true } },
        },
      })

      const hasMore = expenses.length > take
      const items = hasMore ? expenses.slice(0, take) : expenses

      const activity = items.map((expense) => {
        const userSplit = expense.splits.find((s) => s.userId === user.id)
        let summary: 'you_paid' | 'you_owe' | 'not_involved'

        if (expense.paidById === user.id) {
          summary = 'you_paid'
        } else if (userSplit) {
          summary = 'you_owe'
        } else {
          summary = 'not_involved'
        }

        return {
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          paidBy: expense.paidBy,
          splits: expense.splits,
          group: expense.group,
          date: expense.date,
          createdAt: expense.createdAt,
          summary,
          yourShare: userSplit ? userSplit.amount : null,
        }
      })

      const nextCursor = hasMore
        ? items[items.length - 1].createdAt.toISOString()
        : null

      return jsonResponse({ activity, nextCursor, hasMore })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
