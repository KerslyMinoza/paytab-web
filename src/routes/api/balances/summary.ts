import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/balances/summary')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const owedToMe = await prisma.expenseSplit.aggregate({
        where: {
          expense: { paidById: user.id },
          userId: { not: user.id },
        },
        _sum: { amount: true },
      })

      const iOwe = await prisma.expenseSplit.aggregate({
        where: {
          userId: user.id,
          expense: { paidById: { not: user.id } },
        },
        _sum: { amount: true },
      })

      const settlementsIPaid = await prisma.settlement.aggregate({
        where: { payerId: user.id },
        _sum: { amount: true },
      })

      const settlementsIReceived = await prisma.settlement.aggregate({
        where: { payeeId: user.id },
        _sum: { amount: true },
      })

      const rawOwedToMe = parseFloat(String(owedToMe._sum.amount || 0))
      const rawIOwe = parseFloat(String(iOwe._sum.amount || 0))
      const paidOut = parseFloat(String(settlementsIPaid._sum.amount || 0))
      const received = parseFloat(String(settlementsIReceived._sum.amount || 0))

      const totalOwedToYou = rawOwedToMe - received
      const totalYouOwe = rawIOwe - paidOut
      const netBalance = totalOwedToYou - totalYouOwe

      let label: string
      if (netBalance > 0) {
        label = 'you_are_owed'
      } else if (netBalance < 0) {
        label = 'you_owe'
      } else {
        label = 'settled'
      }

      return jsonResponse({
        totalOwedToYou,
        totalYouOwe,
        netBalance,
        label,
        currency: 'PHP',
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
