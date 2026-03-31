import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { AppError, UnauthorizedError } from '~/lib/errors'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '~/lib/jwt'
import prisma from '~/lib/prisma'

const REFRESH_TOKEN_DAYS = 7

export const Route = createFileRoute('/api/auth/refresh')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await parseBody<{ refreshToken?: string }>(request)
      const { refreshToken } = body

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400)
      }

      let payload: any
      try {
        payload = verifyRefreshToken(refreshToken)
      } catch {
        throw new UnauthorizedError('Invalid or expired refresh token')
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })

      if (!storedToken) {
        throw new UnauthorizedError('Refresh token not found or already used')
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } })
        throw new UnauthorizedError('Refresh token has expired')
      }

      await prisma.refreshToken.delete({ where: { id: storedToken.id } })

      const userId = payload.sub as string
      const newAccessToken = signAccessToken(userId)
      const newRefreshTokenValue = signRefreshToken(userId)

      await prisma.refreshToken.create({
        data: {
          token: newRefreshTokenValue,
          userId,
          expiresAt: new Date(
            Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      })

      return jsonResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenValue,
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
