import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import prisma from '~/lib/prisma'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      await authenticateRequest(request)

      const body = await parseBody<{ refreshToken?: string }>(request)
      const { refreshToken } = body

      if (refreshToken) {
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken },
        })
      }

      return jsonResponse({ message: 'Logged out successfully' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
