import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/balances/groups')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      })

      const groupIds = memberships.map((m) => m.groupId)

      const groups = await prisma.group.findMany({
        where: { id: { in: groupIds } },
        include: {
          expenses: {
            include: {
              splits: true,
            },
          },
        },
      })

      const balances = groups.map((group) => {
        let balance = 0

        for (const expense of group.expenses) {
          if (expense.paidById === user.id) {
            for (const split of expense.splits) {
              if (split.userId !== user.id) {
                balance += parseFloat(String(split.amount))
              }
            }
          } else {
            const mySplit = expense.splits.find((s) => s.userId === user.id)
            if (mySplit) {
              balance -= parseFloat(String(mySplit.amount))
            }
          }
        }

        return {
          group: { id: group.id, name: group.name },
          balance,
          label: balance > 0 ? 'owes_you' : balance < 0 ? 'you_owe' : 'settled',
        }
      })

      return jsonResponse({ balances })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
