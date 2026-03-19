// scripts/migrate.js
// Run: node scripts/migrate.js
// Safely adds OT columns to labour_entries and creates payment_records table

require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function migrate() {
  console.log('🔄 Starting migration...\n')

  // 1. Add OT columns to labour_entries (safe - IF NOT EXISTS)
  console.log('📋 Adding OT columns to labour_entries...')
  const otColumns = [
    ['mason_ot_count',   'INTEGER DEFAULT 0'],
    ['mason_ot_hours',   'NUMERIC(5,2) DEFAULT 0'],
    ['helper_ot_count',  'INTEGER DEFAULT 0'],
    ['helper_ot_hours',  'NUMERIC(5,2) DEFAULT 0'],
    ['women_ot_count',   'INTEGER DEFAULT 0'],
    ['women_ot_hours',   'NUMERIC(5,2) DEFAULT 0'],
  ]

  for (const [col, def] of otColumns) {
    try {
      await sql(`ALTER TABLE labour_entries ADD COLUMN IF NOT EXISTS ${col} ${def}`)
      console.log(`  ✅ ${col}`)
    } catch (e) {
      console.log(`  ⏭  ${col} (already exists or error: ${e.message})`)
    }
  }

  // 2. Create payment_records table
  console.log('\n💳 Creating payment_records table...')
  try {
    await sql(`
      CREATE TABLE IF NOT EXISTS payment_records (
        id           SERIAL PRIMARY KEY,
        site_id      INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        contractor_name VARCHAR(200),
        payment_date DATE NOT NULL,
        payment_type VARCHAR(30) NOT NULL DEFAULT 'payment'
                     CHECK (payment_type IN ('payment','advance','ot_payment','adjustment')),
        amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
        notes        TEXT,
        created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('  ✅ payment_records table ready')
  } catch (e) {
    console.log(`  ⏭  payment_records: ${e.message}`)
  }

  // 3. Create user_sites table if not exists (from previous migrations)
  console.log('\n👥 Ensuring user_sites table...')
  try {
    await sql(`
      CREATE TABLE IF NOT EXISTS user_sites (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, site_id)
      )
    `)
    await sql(`
      INSERT INTO user_sites (user_id, site_id)
      SELECT id, site_id FROM users
      WHERE site_id IS NOT NULL AND role = 'manager'
      ON CONFLICT DO NOTHING
    `)
    console.log('  ✅ user_sites ready')
  } catch (e) {
    console.log(`  ⏭  user_sites: ${e.message}`)
  }

  console.log('\n🎉 Migration complete!\n')
  console.log('New OT fields added to labour_entries:')
  console.log('  - mason_ot_count, mason_ot_hours')
  console.log('  - helper_ot_count, helper_ot_hours')
  console.log('  - women_ot_count, women_ot_hours')
  console.log('\nNew table: payment_records')
  process.exit(0)
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
