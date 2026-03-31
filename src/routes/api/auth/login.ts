import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { AppError, UnauthorizedError } from '~/lib/errors'
import { signAccessToken, signRefreshToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import bcrypt from 'bcrypt'

const REFRESH_TOKEN_DAYS = 7

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await parseBody<{
        email?: string
        password?: string
      }>(request)

      const { email, password } = body

      if (!email || !password) {
        throw new AppError('Email and password are required', 400)
      }

      const emailLower = email.toLowerCase().trim()

      const user = await prisma.user.findUnique({
        where: { email: emailLower },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          passwordHash: true,
          emailVerified: true,
        },
      })

      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid email or password')
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash)
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password')
      }

      if (!user.emailVerified) {
        throw new AppError('Please verify your email before logging in', 403)
      }

      const accessToken = signAccessToken(user.id)
      const refreshTokenValue = signRefreshToken(user.id)

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenValue,
          userId: user.id,
          expiresAt: new Date(
            Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      })

      const { passwordHash: _, ...safeUser } = user

      return jsonResponse({
        user: {
          id: safeUser.id,
          email: safeUser.email,
          name: safeUser.name,
          avatarUrl: safeUser.avatarUrl,
        },
        accessToken,
        refreshToken: refreshTokenValue,
      })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
