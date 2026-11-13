/**
 * One-time RentEase Administrator Initialization CLI Script
 *
 * Usage:
 *   npx vite-node scripts/init-admin.ts
 *
 * Or non-interactively:
 *   npx vite-node scripts/init-admin.ts --username=admin --password=YourPassword123 --name="Landlord Name" --phone="9876543210" --upi="owner@upi"
 */

import readline from 'readline';
import { initializeFirstAdmin } from '../src/services/admin-init-service';
import { isSystemInitialized } from '../src/services/settings-service';
import { authErrorMessage } from '../src/lib/auth-errors';

function promptQuestion(rl: readline.Interface, query: string, defaultValue = ''): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      resolve(ans.trim() || defaultValue);
    });
  });
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const separator = arg.indexOf('=');
      if (separator < 0) continue;
      const key = arg.slice(2, separator);
      const val = arg.slice(separator + 1);
      if (key && val) {
        args[key] = val;
      }
    }
  }
  return args;
}

async function main() {
  console.log('\n======================================================');
  console.log('   🏠 RentEase — Initial Administrator Setup');
  console.log('======================================================\n');

  const cliArgs = parseArgs();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (await isSystemInitialized()) {
      throw new Error('System is already initialized. Sign in at http://localhost:5173/login.');
    }
    const name =
      cliArgs.name ||
      (await promptQuestion(rl, '1. Full Name of Administrator [Property Manager]: ', 'Property Manager'));

    const username =
      cliArgs.username ||
      (await promptQuestion(rl, '2. Administrator Username [admin]: ', 'admin'));

    let password = cliArgs.password;
    while (!password || password.length < 8) {
      password = await promptQuestion(rl, '3. Secure Password (min 8 characters): ');
      if (password.length < 8) {
        console.log('   ❌ Password must be at least 8 characters long.\n');
      }
    }

    const phone =
      cliArgs.phone ||
      (await promptQuestion(rl, '4. Phone Number [+91 98765 43210]: ', '+91 98765 43210'));

    const businessName =
      cliArgs.business ||
      (await promptQuestion(rl, '5. Property / Business Name [RentEase Residences]: ', 'RentEase Residences'));

    const upiId =
      cliArgs.upi ||
      (await promptQuestion(rl, '6. Landlord UPI ID for rent payments [owner@upi]: ', 'owner@upi'));

    console.log('\n⏳ Creating primary administrator account...');

    const { email } = await initializeFirstAdmin({ username, password, name, phone, businessName, upiId });

    console.log('\n✅ Administrator account successfully initialized!');
    console.log('------------------------------------------------------');
    console.log(`👤 Name:     ${name}`);
    console.log(`🔑 Username: ${username}`);
    console.log(`📧 Email:    ${email}`);
    console.log(`📱 Phone:    ${phone}`);
    console.log(`🏦 UPI ID:   ${upiId}`);
    console.log('------------------------------------------------------');
    console.log('👉 You can now log into RentEase at http://localhost:5173/login\n');
  } catch (err: unknown) {
    console.error('\n❌ Initialization failed:', authErrorMessage(err));
    process.exitCode = 1;
  } finally {
    rl.close();
    process.exit(process.exitCode || 0);
  }
}

main();

