import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const users = await sql`
      SELECT u.id, u.username, u.password_hash, u.full_name, u.role, u.site_id, s.name as site_name
      FROM users u
      LEFT JOIN sites s ON u.site_id = s.id
      WHERE u.username = ${username}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await signToken({
      id: user.id,
      username: user.username,
      fullName: user.full_name || user.username,
      role: user.role,
      siteId: user.site_id || undefined,
      siteName: user.site_name || undefined,
    })

    const response = NextResponse.json({ role: user.role, success: true })
    response.cookies.set('ilt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
