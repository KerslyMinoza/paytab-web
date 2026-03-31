import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { AppError } from '~/lib/errors'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/auth/complete-profile')({
  server: {
    handlers: {
  PATCH: async ({ request }) => {
    try {
      const authUser = await authenticateRequest(request)

      const body = await parseBody<{ name?: string }>(request)
      const { name } = body

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('Name is required', 400)
      }

      const user = await prisma.user.update({
        where: { id: authUser.id },
        data: { name: name.trim() },
        select: { id: true, email: true, name: true, avatarUrl: true },
      })

      return jsonResponse({ user })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
