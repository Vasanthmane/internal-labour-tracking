import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export { sql }

// Raw parameterized query helper (fixes Neon null type errors)
export const query = (text: string, params: any[] = []) => sql(text, params)

export async function addUserSitesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_sites (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, site_id)
    )
  `
  // Migrate existing site_id assignments
  await sql`
    INSERT INTO user_sites (user_id, site_id)
    SELECT id, site_id FROM users
    WHERE site_id IS NOT NULL AND role = 'manager'
    ON CONFLICT DO NOTHING
  `
}
