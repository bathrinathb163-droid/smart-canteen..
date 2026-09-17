const { initDatabase } = require('../config/db');

async function runSetup() {
  console.log('Running Smart Canteen Database Setup...');
  const success = await initDatabase();
  if (success) {
    console.log('Database setup completed successfully.');
  } else {
    console.log('Database initialized in fallback mode. To connect to MySQL, verify DB credentials in backend/.env');
  }
  process.exit(0);
}

runSetup();
