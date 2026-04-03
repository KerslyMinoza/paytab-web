import { createFileRoute } from '@tanstack/react-router'
import { jsonResponse, errorResponse, parseBody } from '~/lib/api-utils'
import { authenticateRequest } from '~/lib/auth'
import { AppError, ConflictError } from '~/lib/errors'
import prisma from '~/lib/prisma'
import crypto from 'crypto'
import { sendAuthInviteEmail, sendFriendRequestEmail } from '~/lib/resend'

const INVITE_EXPIRY_DAYS = 7

export const Route = createFileRoute('/api/friends/invite')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const user = await authenticateRequest(request)

      const body = await parseBody<{ email?: string; localName?: string }>(request)
      const { email, localName } = body

      if (!email) {
        throw new AppError('Email is required', 400)
      }

      const emailLower = email.toLowerCase().trim()

      if (emailLower === user.email) {
        throw new AppError('You cannot invite yourself', 400)
      }

      const existingInvite = await prisma.friendship.findUnique({
        where: { userId_friendEmail: { userId: user.id, friendEmail: emailLower } },
      })

      if (existingInvite) {
        throw new ConflictError('An invite has already been sent to this email')
      }

      const targetUser = await prisma.user.findUnique({
        where: { email: emailLower },
        select: { id: true, email: true, name: true },
      })

      if (targetUser) {
        const existingFriendship = await prisma.friendship.findUnique({
          where: { userId_friendId: { userId: user.id, friendId: targetUser.id } },
        })

        if (existingFriendship) {
          throw new ConflictError('A friendship already exists with this user')
        }

        const friendship = await prisma.friendship.create({
          data: {
            userId: user.id,
            friendId: targetUser.id,
            friendEmail: emailLower,
            localName: localName || null,
            status: 'PENDING_INVITE',
          },
        })

        sendFriendRequestEmail({
          to: targetUser.email,
          inviterName: user.name || user.email,
          friendshipId: friendship.id,
        })

        return jsonResponse({ friendship }, 201)
      }

      const friendship = await prisma.friendship.create({
        data: {
          userId: user.id,
          friendId: null,
          friendEmail: emailLower,
          localName: localName || null,
          status: 'PENDING_INVITE',
        },
      })

      const token = crypto.randomBytes(32).toString('hex')
      await prisma.inviteToken.create({
        data: {
          token,
          friendshipId: friendship.id,
          email: emailLower,
          expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        },
      })

      sendAuthInviteEmail({
        to: emailLower,
        inviterName: user.name || user.email,
        token,
      })

      return jsonResponse({ friendship }, 201)
    } catch (err) {
      return errorResponse(err)
    }
  },
    },
  },
})
