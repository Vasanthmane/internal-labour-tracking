require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')

const sql = neon(process.env.DATABASE_URL)

const SITES = [
  { name: 'Guntakal', description: 'KHDP(GTL) works' },
  { name: 'Bridges SKLR', description: 'Bridge works - SKLR zone' },
  { name: 'Zone J', description: 'Zone J railway works - YPR' },
  { name: 'Gathi Shakti YPR', description: 'Gathi Shakti works - Yeshwantpur' },
  { name: 'Gathi Shakti Majestic', description: 'Gathi Shakti works - Majestic' },
  { name: 'Upgradation', description: 'Upgradation works' },
  { name: 'Minor Bridges', description: 'Minor bridge works' },
  { name: 'Zone G', description: 'Zone G - multi location' },
  { name: 'Calicut', description: 'Calicut (CLT) works' },
  { name: 'Divyanga', description: 'Divyanga works - Sidlghatta area' },
  { name: 'Chikballapur', description: 'Chikballapur works' },
  { name: 'Yalahanka', description: 'Yalahanka (YNK) works' },
  { name: 'PGT', description: 'Railway hospital works' },
]

const MANAGERS = [
  { username: 'narasimharaju', password: 'gtkl@123', full_name: 'Narasimha Raju', site: 'Guntakal' },
  { username: 'mahantesh', password: 'skl@123', full_name: 'Mahantesh', site: 'Bridges SKLR' },
  { username: 'channa', password: 'zone j@123', full_name: 'Channa', site: 'Zone J' },
  { username: 'channaypr', password: 'yprgati@123', full_name: 'Channa Basava Nayak', site: 'Gathi Shakti YPR' },
  { username: 'bhargav', password: 'mjgati@123', full_name: 'Bhargav', site: 'Gathi Shakti Majestic' },
  { username: 'bhargavup', password: 'up@123', full_name: 'Bhargav / Shashidar', site: 'Upgradation' },
  { username: 'salman', password: 'mi@123', full_name: 'Salman', site: 'Minor Bridges' },
  { username: 'salmanzoneg', password: 'ng@123', full_name: 'Salman', site: 'Zone G' },
  { username: 'manikandannair', password: 'clt@123', full_name: 'Manikandan Nair', site: 'Calicut' },
  { username: 'raveendra', password: 'dy@123', full_name: 'Raveendra', site: 'Divyanga' },
  { username: 'shashikumar', password: '@ckbl@123', full_name: 'Shashikumar', site: 'Chikballapur' },
  { username: 'nikil', password: 'ylk@123', full_name: 'Nikil', site: 'Yalahanka' },
  { username: 'bhargavpgt', password: 'pgt@123', full_name: 'Bhargav', site: 'PGT' },
]

const CONTRACTORS = [
  'Ramesh Constructions',
  'SLV Works',
  'Sai Labour Contract',
  'Shakti Civil Team',
  'Metro Build Crew',
  'AK Contractors'
]

const LOCATIONS = [
  'North Yard',
  'Platform 1',
  'Bridge Section',
  'East Gate',
  'Main Block',
  'Track Side'
]

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

async function seed() {
  console.log('🌱 Starting seed...\n')

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

  const adminExists = await sql`SELECT id FROM users WHERE username = 'admin'`
  if (adminExists.length === 0) {
    const hash = await bcrypt.hash('admin@123', 12)
    await sql`INSERT INTO users (username, password_hash, full_name, role) VALUES ('admin', ${hash}, 'System Admin', 'admin')`
    console.log('👤 Admin created → admin / admin@123')
  } else {
    console.log('👤 Admin already exists')
  }

  const siteMap = {}
  for (const s of SITES) {
    const existing = await sql`SELECT id FROM sites WHERE name = ${s.name}`
    if (existing.length > 0) {
      siteMap[s.name] = existing[0].id
    } else {
      const r = await sql`INSERT INTO sites (name, description) VALUES (${s.name}, ${s.description}) RETURNING id`
      siteMap[s.name] = r[0].id
    }
  }

  for (const m of MANAGERS) {
    const existing = await sql`SELECT id FROM users WHERE username = ${m.username}`
    if (existing.length > 0) continue
    const hash = await bcrypt.hash(m.password, 12)
    await sql`
      INSERT INTO users (username, password_hash, full_name, role, site_id)
      VALUES (${m.username}, ${hash}, ${m.full_name}, 'manager', ${siteMap[m.site] || null})
    `
  }

  const existingEntries = await sql`SELECT COUNT(*)::int AS count FROM labour_entries`
  if (existingEntries[0].count === 0) {
    const admins = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
    const managers = await sql`SELECT id, site_id FROM users WHERE role = 'manager' ORDER BY id`
    const adminId = admins[0]?.id

    const managerBySite = new Map()
    for (const m of managers) {
      if (m.site_id && !managerBySite.has(m.site_id)) {
        managerBySite.set(m.site_id, m.id)
      }
    }

    const sites = await sql`SELECT id, name FROM sites WHERE is_active = true ORDER BY id`
    const today = new Date()
    let inserted = 0

    for (let s = 0; s < Math.min(sites.length, 8); s++) {
      const site = sites[s]
      const createdBy = managerBySite.get(site.id) || adminId

      for (let i = 0; i < 6; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)

        const mason = 2 + ((s + i) % 4)
        const helper = 4 + ((s + i * 2) % 6)
        const women = (s + i) % 3
        const payment = mason * 900 + helper * 600 + women * 550 + i * 150
        const advance = i % 2 === 0 ? 500 + s * 50 : 0

        await sql`
          INSERT INTO labour_entries (
            site_id,
            entry_date,
            location,
            contractor_name,
            mason_count,
            helper_count,
            women_helper_count,
            ot_details,
            payment_amount,
            advance_amount,
            remarks,
            created_by
          ) VALUES (
            ${site.id},
            ${formatDate(d)}::date,
            ${LOCATIONS[(s + i) % LOCATIONS.length]},
            ${CONTRACTORS[(s + i) % CONTRACTORS.length]},
            ${mason},
            ${helper},
            ${women},
            ${i % 2 === 0 ? '2 hours OT for concrete finishing' : null},
            ${payment},
            ${advance},
            ${i % 3 === 0 ? 'Material unloading and site prep' : 'Regular shift work'},
            ${createdBy}
          )
        `
        inserted++
      }
    }

    console.log(`🧱 Inserted ${inserted} sample labour entries`)
  } else {
    console.log(`🧱 Labour entries already exist (${existingEntries[0].count})`)
  }

  console.log('\n🎉 Seed complete!')
  console.log('Username: admin')
  console.log('Password: admin@123')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
