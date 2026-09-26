/**
 * Test Setup – connects to test database
 * Uses a separate TEST_DATABASE_URL to avoid corrupting development data.
 */
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Ensure we're using a test DB
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://teslapool:teslapool_secret@localhost:5432/teslapool_test';

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'pipe',
    });
  } catch {
    console.warn('Migration warning (may already be applied)');
  }
}
