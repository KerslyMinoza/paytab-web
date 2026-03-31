import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/users/me')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      })

      if (!fullUser) {
        return jsonResponse({ error: { message: 'User not found' } }, 404)
      }

      return jsonResponse({ user: fullUser })
    } catch (err) {
      return errorResponse(err)
    }
  },

  PUT: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)
      const body = await parseBody<{ name?: string; avatarUrl?: string }>(request)

      const data: Record<string, string> = {}
      if (body.name !== undefined) data.name = body.name
      if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
        data,
      })

      return jsonResponse({ user: updatedUser })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
