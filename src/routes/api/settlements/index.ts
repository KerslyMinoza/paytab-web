import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/settlements/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const settlements = await prisma.settlement.findMany({
        where: {
          OR: [{ payerId: user.id }, { payeeId: user.id }],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          payer: { select: { id: true, email: true, name: true, avatarUrl: true } },
          payee: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      })

      return jsonResponse({ settlements })
    } catch (err) {
      return errorResponse(err)
    }
  },

  POST: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const body = await parseBody<{
        payeeId?: string
        amount?: number
        currency?: string
        groupId?: string
        note?: string
      }>(request)

      const { payeeId, amount, currency, groupId, note } = body

      if (!payeeId) {
        throw new AppError('payeeId is required', 400)
      }

      if (!amount || amount <= 0) {
        throw new AppError('amount must be a positive number', 400)
      }

      if (payeeId === user.id) {
        throw new AppError('You cannot settle with yourself', 400)
      }

      const settlement = await prisma.settlement.create({
        data: {
          payerId: user.id,
          payeeId,
          amount,
          currency: currency || 'PHP',
          groupId: groupId || null,
          note: note || null,
        },
        include: {
          payer: { select: { id: true, email: true, name: true, avatarUrl: true } },
          payee: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      })

      return jsonResponse({ settlement }, 201)
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
