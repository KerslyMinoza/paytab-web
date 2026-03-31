import { verifyAccessToken } from './jwt'
import { UnauthorizedError } from './errors'
import prisma from './prisma'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export async function authenticateRequest(request: Request): Promise<AuthUser> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid token')
  }

  const token = header.split(' ')[1]

  let payload: any
  try {
    payload = verifyAccessToken(token)
  } catch (err: any) {
    throw new UnauthorizedError('Invalid or expired token')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    select: { id: true, email: true, name: true, avatarUrl: true },
  })

  if (!user) throw new UnauthorizedError('User no longer exists')

  return user as AuthUser
}
