import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/friends/pending')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const requests = await prisma.friendship.findMany({
        where: {
          friendId: user.id,
          status: 'PENDING_INVITE',
        },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      })

      return jsonResponse({ requests })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
