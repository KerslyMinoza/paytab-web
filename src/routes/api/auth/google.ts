import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse } from '~/lib/api-utils'

export const Route = createFileRoute('/api/auth/google')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      return jsonResponse({
        success: false,
        message: 'Google authentication is not yet implemented. Requires Google token verification.',
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
