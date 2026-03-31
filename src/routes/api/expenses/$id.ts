import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, NotFoundError, ForbiddenError } from '~/lib/errors'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/expenses/$id')({
  server: {
    handlers: {
  GET: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const expense = await prisma.expense.findUnique({
        where: { id },
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

      if (!expense) {
        throw new NotFoundError('Expense')
      }

      return jsonResponse({ expense })
    } catch (err) {
      return errorResponse(err)
    }
  },

  PUT: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const existing = await prisma.expense.findUnique({
        where: { id },
        include: { splits: true },
      })

      if (!existing) {
        throw new NotFoundError('Expense')
      }

      if (existing.paidById !== user.id) {
        throw new ForbiddenError('Only the payer can update this expense')
      }

      const body = await parseBody<{
        description?: string
        amount?: number
        currency?: string
        splitWith?: string[]
        date?: string
      }>(request)

      const updateData: any = {}
      if (body.description !== undefined) updateData.description = body.description
      if (body.amount !== undefined) updateData.amount = body.amount
      if (body.currency !== undefined) updateData.currency = body.currency
      if (body.date !== undefined) updateData.date = new Date(body.date)

      if (body.splitWith && body.amount !== undefined) {
        const allUserIds = [user.id, ...body.splitWith]
        const splitAmount = parseFloat((body.amount / allUserIds.length).toFixed(2))
        const remainder = parseFloat(
          (body.amount - splitAmount * allUserIds.length).toFixed(2),
        )

        const splits = allUserIds.map((userId, index) => ({
          expenseId: id,
          userId,
          amount: index === 0 ? splitAmount + remainder : splitAmount,
        }))

        await prisma.$transaction([
          prisma.expenseSplit.deleteMany({ where: { expenseId: id } }),
          prisma.expense.update({ where: { id }, data: updateData }),
          prisma.expenseSplit.createMany({ data: splits }),
        ])

        const expense = await prisma.expense.findUnique({
          where: { id },
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

        return jsonResponse({ expense })
      }

      const expense = await prisma.expense.update({
        where: { id },
        data: updateData,
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

      return jsonResponse({ expense })
    } catch (err) {
      return errorResponse(err)
    }
  },

  DELETE: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { id } = params

      const expense = await prisma.expense.findUnique({ where: { id } })

      if (!expense) {
        throw new NotFoundError('Expense')
      }

      if (expense.paidById !== user.id) {
        throw new ForbiddenError('Only the payer can delete this expense')
      }

      await prisma.expense.delete({ where: { id } })

      return jsonResponse({ message: 'Expense deleted' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
