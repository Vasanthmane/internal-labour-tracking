import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(200),
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager')),
        site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS labour_entries (
        id SERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        entry_date DATE NOT NULL,
        location VARCHAR(200),
        contractor_name VARCHAR(200),
        mason_count INTEGER DEFAULT 0,
        helper_count INTEGER DEFAULT 0,
        women_helper_count INTEGER DEFAULT 0,
        ot_details TEXT,
        payment_amount DECIMAL(12,2) DEFAULT 0,
        advance_amount DECIMAL(12,2) DEFAULT 0,
        remarks TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Check if admin exists
    const admins = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    if (admins.length === 0) {
      const hash = await bcrypt.hash('admin@123', 12)
      await sql`
        INSERT INTO users (username, password_hash, full_name, role)
        VALUES ('admin', ${hash}, 'System Admin', 'admin')
      `
    }

    return NextResponse.json({ success: true, message: 'Database initialized. Admin: admin / admin@123' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
