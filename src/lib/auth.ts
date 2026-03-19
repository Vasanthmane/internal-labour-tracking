import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production-32chars'
)

export interface TokenPayload {
  id: number
  username: string
  fullName: string
  role: 'admin' | 'manager'
  siteId?: number
  siteName?: string
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function getUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('ilt_token')?.value
  if (!token) return null
  return verifyToken(token)
}
