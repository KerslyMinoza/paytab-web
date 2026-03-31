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

export const Route = createFileRoute('/api/balances/friends')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const friendships = await prisma.friendship.findMany({
        where: { userId: user.id, status: 'ACCEPTED' },
        include: {
          friend: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      })

      const balances = await Promise.all(
        friendships.map(async (f) => {
          const balance = await computeFriendBalance(user.id, f.friendId!)
          return {
            friend: f.friend,
            balance,
            label: balance > 0 ? 'owes_you' : balance < 0 ? 'you_owe' : 'settled',
          }
        }),
      )

      return jsonResponse({ balances })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
