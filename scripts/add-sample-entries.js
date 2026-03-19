require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

async function main() {
  console.log('Adding sample labour entries...')

  const sites = await sql`SELECT id, name FROM sites WHERE is_active = true ORDER BY id`
  if (!sites.length) {
    console.log('No sites found. Run npm run seed first.')
    process.exit(1)
  }

  const admins = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
  const managers = await sql`SELECT id, site_id FROM users WHERE role = 'manager' ORDER BY id`

  const adminId = admins[0]?.id
  if (!adminId) {
    console.log('No admin found. Run npm run seed first.')
    process.exit(1)
  }

  const managerBySite = new Map()
  for (const m of managers) {
    if (m.site_id && !managerBySite.has(m.site_id)) {
      managerBySite.set(m.site_id, m.id)
    }
  }

  const contractors = [
    'Ramesh Constructions',
    'SLV Works',
    'Sai Labour Contract',
    'Shakti Civil Team',
    'Metro Build Crew',
    'AK Contractors'
  ]

  const locations = [
    'North Yard',
    'Platform 1',
    'Bridge Section',
    'East Gate',
    'Main Block',
    'Track Side'
  ]

  let inserted = 0
  const today = new Date()

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
          ${locations[(s + i) % locations.length]},
          ${contractors[(s + i) % contractors.length]},
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

  const count = await sql`SELECT COUNT(*)::int AS count FROM labour_entries`
  console.log(`Inserted ${inserted} sample entries`)
  console.log('Total labour_entries:', count[0].count)
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
