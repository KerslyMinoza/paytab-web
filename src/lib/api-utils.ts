import { AppError } from './errors'
import { Prisma } from '../../generated/prisma/client'

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return jsonResponse(
        { error: { message: `Duplicate value on: ${(err.meta?.target as string[])?.join(', ')}` } },
        409,
      )
    }
    if (err.code === 'P2025') {
      return jsonResponse({ error: { message: 'Record not found' } }, 404)
    }
  }

  if (err instanceof AppError) {
    return jsonResponse({ error: { message: err.message } }, err.statusCode)
  }

  console.error(err)
  return jsonResponse({ error: { message: 'Internal server error' } }, 500)
}

export async function parseBody<T = any>(request: Request): Promise<T> {
  return request.json() as Promise<T>
}

export function getSearchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams
}
