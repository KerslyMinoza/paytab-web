import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError } from '~/lib/errors'
import prisma from '~/lib/prisma'
import bcrypt from 'bcrypt'

export const Route = createFileRoute('/api/users/me_/password')({
  server: {
    handlers: {
  PUT: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)
      const body = await parseBody<{
        currentPassword: string
        newPassword: string
      }>(request)

      if (!body.currentPassword || !body.newPassword) {
        throw new AppError('currentPassword and newPassword are required', 400)
      }

      if (body.newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters', 400)
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      })

      if (!dbUser) {
        throw new AppError('User not found', 404)
      }

      const isMatch = await bcrypt.compare(
        body.currentPassword,
        dbUser.passwordHash,
      )

      if (!isMatch) {
        throw new AppError('Current password is incorrect', 401)
      }

      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(body.newPassword, salt)

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })

      return jsonResponse({ message: 'Password updated successfully' })
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
