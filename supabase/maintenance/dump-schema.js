const { Client } = require('pg');
const fs = require('fs');

const DB_URL = process.argv[2];

if (!DB_URL) {
  console.error('Uso: node dump-schema.js "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"');
  process.exit(1);
}

async function dump() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let sql = '';

  // --- SEQUENCES ---
  const seqs = await client.query(`
    SELECT sequence_name, start_value, increment, minimum_value, maximum_value, cycle_option
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `);
  for (const s of seqs.rows) {
    sql += `CREATE SEQUENCE IF NOT EXISTS public.${s.sequence_name}\n`;
    sql += `  START WITH ${s.start_value}\n`;
    sql += `  INCREMENT BY ${s.increment}\n`;
    sql += `  MINVALUE ${s.minimum_value}\n`;
    sql += `  MAXVALUE ${s.maximum_value}\n`;
    sql += `  ${s.cycle_option === 'YES' ? 'CYCLE' : 'NO CYCLE'};\n\n`;
  }

  // --- TABLES ---
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  for (const t of tables.rows) {
    const tname = t.table_name;

    // columns
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name, character_maximum_length,
             numeric_precision, numeric_scale, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tname]);

    // constraints
    const cons = await client.query(`
      SELECT tc.constraint_name, tc.constraint_type,
             kcu.column_name,
             ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
             rc.update_rule, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1
      ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position
    `, [tname]);

    const lines = [];

    for (const c of cols.rows) {
      let type = '';
      if (c.data_type === 'USER-DEFINED') {
        type = c.udt_name;
      } else if (c.data_type === 'character varying') {
        type = c.character_maximum_length ? `varchar(${c.character_maximum_length})` : 'varchar';
      } else if (c.data_type === 'numeric' && c.numeric_precision) {
        type = `numeric(${c.numeric_precision},${c.numeric_scale})`;
      } else {
        type = c.data_type;
      }

      let col = `  "${c.column_name}" ${type}`;
      if (c.is_nullable === 'NO') col += ' NOT NULL';
      if (c.column_default) col += ` DEFAULT ${c.column_default}`;
      lines.push(col);
    }

    // group constraints
    const grouped = {};
    for (const r of cons.rows) {
      if (!grouped[r.constraint_name]) grouped[r.constraint_name] = { ...r, columns: [] };
      grouped[r.constraint_name].columns.push(r.column_name);
    }

    for (const [cname, r] of Object.entries(grouped)) {
      const cols_str = r.columns.map(c => `"${c}"`).join(', ');
      if (r.constraint_type === 'PRIMARY KEY') {
        lines.push(`  CONSTRAINT "${cname}" PRIMARY KEY (${cols_str})`);
      } else if (r.constraint_type === 'UNIQUE') {
        lines.push(`  CONSTRAINT "${cname}" UNIQUE (${cols_str})`);
      } else if (r.constraint_type === 'FOREIGN KEY') {
        let fk = `  CONSTRAINT "${cname}" FOREIGN KEY (${cols_str})\n    REFERENCES public."${r.foreign_table}" ("${r.foreign_column}")`;
        if (r.update_rule && r.update_rule !== 'NO ACTION') fk += ` ON UPDATE ${r.update_rule}`;
        if (r.delete_rule && r.delete_rule !== 'NO ACTION') fk += ` ON DELETE ${r.delete_rule}`;
        lines.push(fk);
      }
    }

    sql += `CREATE TABLE public."${tname}" (\n${lines.join(',\n')}\n);\n\n`;
  }

  // --- INDEXES (excluding PKs) ---
  const idxs = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public'
      )
    ORDER BY tablename, indexname
  `);
  for (const i of idxs.rows) {
    sql += i.indexdef + ';\n';
  }
  if (idxs.rows.length > 0) sql += '\n';

  await client.end();

  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const filename = `CREATE_SCHEMA_${ts}.sql`;

  fs.writeFileSync(filename, sql);
  console.log(`✅ ${filename} generato!`);
}

dump().catch(e => { console.error('❌ Errore:', e.message); process.exit(1); });
