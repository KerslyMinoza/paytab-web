import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, ForbiddenError, NotFoundError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/groups/$id/expenses')({
  server: {
    handlers: {
  GET: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError('You are not a member of this group')
      }

      const expenses = await prisma.expense.findMany({
        where: { groupId: id },
        include: {
          paidBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
          splits: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      })

      return jsonResponse({ expenses })
    } catch (err) {
      return errorResponse(err)
    }
  },

  POST: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params
      const body = await parseBody<{
        description: string
        amount: number
        currency: string
        paidById: string
        splitWith: string[]
        splitType: 'EQUAL' | 'EXACT'
        splitAmounts?: Record<string, number>
        date?: string
      }>(request)

      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError('You are not a member of this group')
      }

      if (!body.description || !body.amount || !body.paidById || !body.splitWith) {
        throw new AppError(
          'description, amount, paidById, and splitWith are required',
          400,
        )
      }

      if (body.amount <= 0) {
        throw new AppError('Amount must be greater than zero', 400)
      }

      const { description, amount, currency, paidById, splitWith, splitType } =
        body
      const groupId = id

      let splitAmounts: { userId: string; amount: number }[]

      if (splitType === 'EQUAL') {
        const perPerson = parseFloat((amount / splitWith.length).toFixed(2))
        const remainder = parseFloat(
          (amount - perPerson * splitWith.length).toFixed(2),
        )
        splitAmounts = splitWith.map((userId: string, i: number) => ({
          userId,
          amount: i === 0 ? perPerson + remainder : perPerson,
        }))
      } else if (splitType === 'EXACT') {
        splitAmounts = splitWith.map((userId: string) => ({
          userId,
          amount: body.splitAmounts?.[userId] || 0,
        }))
        const sum = splitAmounts.reduce((s, x) => s + x.amount, 0)
        if (Math.abs(sum - amount) > 0.01) {
          throw new AppError('Split amounts must equal total', 400)
        }
      } else {
        splitAmounts = []
      }

      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          currency: currency || 'USD',
          paidById,
          groupId,
          date: body.date ? new Date(body.date) : new Date(),
          splits: {
            create: splitAmounts.map((split) => ({
              userId: split.userId,
              amount: split.amount,
            })),
          },
        },
        include: {
          paidBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
          splits: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      })

      return jsonResponse({ expense }, 201)
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
