import sql from 'mssql';
import bcrypt from 'bcryptjs';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'WriteUser',
  password: process.env.DB_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};

async function seed() {
  console.log('Connecting to database...');
  const pool = await sql.connect(config);
  console.log('Connected.');

  // --- Seed default branch ---
  const branchCheck = await pool.request()
    .input('code', sql.VarChar(10), 'MAIN')
    .query('SELECT id FROM branches WHERE code = @code');

  let branchId: number;
  if (branchCheck.recordset.length > 0) {
    branchId = branchCheck.recordset[0].id;
    console.log(`Branch MAIN already exists (id=${branchId}), skipping.`);
  } else {
    const branchInsert = await pool.request()
      .input('name', sql.NVarChar(100), 'GBCR Main')
      .input('code', sql.VarChar(10), 'MAIN')
      .query(`
        INSERT INTO branches (name, code)
        OUTPUT INSERTED.id
        VALUES (@name, @code)
      `);
    branchId = branchInsert.recordset[0].id;
    console.log(`Inserted branch GBCR Main (id=${branchId}).`);
  }

  // --- Seed admin user ---
  const userCheck = await pool.request()
    .input('email', sql.VarChar(255), 'admin@gbcr.com')
    .query('SELECT id FROM users WHERE email = @email');

  if (userCheck.recordset.length > 0) {
    console.log('Admin user admin@gbcr.com already exists, skipping.');
  } else {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await pool.request()
      .input('email', sql.VarChar(255), 'admin@gbcr.com')
      .input('password_hash', sql.VarChar(255), passwordHash)
      .input('full_name', sql.NVarChar(100), 'System Administrator')
      .input('role', sql.VarChar(30), 'super_admin')
      .input('branch_id', sql.Int, branchId)
      .input('must_change_password', sql.Bit, 1)
      .query(`
        INSERT INTO users (email, password_hash, full_name, role, branch_id, must_change_password)
        VALUES (@email, @password_hash, @full_name, @role, @branch_id, @must_change_password)
      `);
    console.log('Inserted admin user admin@gbcr.com.');
  }

  // --- Seed vehicle categories ---
  const categories = [
    { name: 'Economy Sedan',  daily_rate: 80,  sort_order: 1 },
    { name: 'Standard Sedan', daily_rate: 100, sort_order: 2 },
    { name: 'Premium Sedan',  daily_rate: 150, sort_order: 3 },
    { name: 'SUV',            daily_rate: 180, sort_order: 4 },
    { name: 'Van',            daily_rate: 120, sort_order: 5 },
    { name: 'Truck Light',    daily_rate: 140, sort_order: 6 },
    { name: 'Truck Heavy',    daily_rate: 200, sort_order: 7 },
  ];

  for (const cat of categories) {
    const catCheck = await pool.request()
      .input('name', sql.NVarChar(50), cat.name)
      .query('SELECT id FROM vehicle_categories WHERE name = @name');

    if (catCheck.recordset.length > 0) {
      console.log(`Vehicle category "${cat.name}" already exists, skipping.`);
    } else {
      await pool.request()
        .input('name', sql.NVarChar(50), cat.name)
        .input('daily_rate', sql.Decimal(10, 2), cat.daily_rate)
        .input('sort_order', sql.Int, cat.sort_order)
        .query(`
          INSERT INTO vehicle_categories (name, daily_rate, sort_order)
          VALUES (@name, @daily_rate, @sort_order)
        `);
      console.log(`Inserted vehicle category "${cat.name}" at $${cat.daily_rate}/day.`);
    }
  }

  await pool.close();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
