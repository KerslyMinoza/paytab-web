import jwt, { type SignOptions } from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export function signAccessToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
  }
  return jwt.sign({ sub: userId }, ACCESS_SECRET, options)
}

export function signRefreshToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  }
  return jwt.sign({ sub: userId }, REFRESH_SECRET, options)
}

export function verifyAccessToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload
}

export function verifyRefreshToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload
}
