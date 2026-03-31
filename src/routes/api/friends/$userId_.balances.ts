import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

async function computeFriendBalance(userId: string, friendId: string): Promise<number> {
  const iPaid = await prisma.expenseSplit.aggregate({
    where: { userId: friendId, expense: { paidById: userId } },
    _sum: { amount: true },
  })
  const theyPaid = await prisma.expenseSplit.aggregate({
    where: { userId: userId, expense: { paidById: friendId } },
    _sum: { amount: true },
  })

  const theyOweMe = parseFloat(String(iPaid._sum.amount || 0))
  const iOweThem = parseFloat(String(theyPaid._sum.amount || 0))

  const mySettlements = await prisma.settlement.aggregate({
    where: { payerId: userId, payeeId: friendId },
    _sum: { amount: true },
  })
  const theirSettlements = await prisma.settlement.aggregate({
    where: { payerId: friendId, payeeId: userId },
    _sum: { amount: true },
  })

  const iPaidSettlements = parseFloat(String(mySettlements._sum.amount || 0))
  const theyPaidSettlements = parseFloat(String(theirSettlements._sum.amount || 0))

  return theyOweMe - iOweThem - iPaidSettlements + theyPaidSettlements
}

export const Route = createFileRoute('/api/friends/$userId_/balances')({
  server: {
    handlers: {
  GET: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { userId: friendUserId } = params

      const totalBalance = await computeFriendBalance(user.id, friendUserId)

      const sharedGroups = await prisma.group.findMany({
        where: {
          members: {
            every: undefined,
          },
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: friendUserId } } },
          ],
        },
        include: {
          expenses: {
            where: {
              OR: [
                { paidById: user.id, splits: { some: { userId: friendUserId } } },
                { paidById: friendUserId, splits: { some: { userId: user.id } } },
              ],
            },
            include: {
              splits: {
                where: { userId: { in: [user.id, friendUserId] } },
              },
            },
          },
        },
      })

      const groupBreakdown = sharedGroups.map((group) => {
        let groupBalance = 0

        for (const expense of group.expenses) {
          for (const split of expense.splits) {
            if (expense.paidById === user.id && split.userId === friendUserId) {
              groupBalance += parseFloat(String(split.amount))
            } else if (expense.paidById === friendUserId && split.userId === user.id) {
              groupBalance -= parseFloat(String(split.amount))
            }
          }
        }

        return {
          group: { id: group.id, name: group.name },
          balance: groupBalance,
          label: groupBalance > 0 ? 'owes_you' : groupBalance < 0 ? 'you_owe' : 'settled',
        }
      })

      return jsonResponse({ totalBalance, groups: groupBreakdown })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
