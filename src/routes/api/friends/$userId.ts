import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/friends/$userId')({
  server: {
    handlers: {
  DELETE: async ({ request, params }) => {
    try {
      const user = await authenticateRequest(request)
      const { userId: friendUserId } = params

      await prisma.$transaction([
        prisma.friendship.deleteMany({
          where: { userId: user.id, friendId: friendUserId },
        }),
        prisma.friendship.deleteMany({
          where: { userId: friendUserId, friendId: user.id },
        }),
      ])

      return jsonResponse({ message: 'Friend removed' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
