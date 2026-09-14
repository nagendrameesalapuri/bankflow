/**
 * BankFlow seed script. Fully fictional data - no real people, accounts, or
 * financial information. Truncates and repopulates every table so it is
 * safe to run repeatedly (used by `npm run db:seed` and POST /api/dev/reset).
 */
import bcrypt from 'bcryptjs';
import { initPool, getPool } from '../../backend/src/db/pool';

function generateAccountNumber(): string {
  let digits = '';
  for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

function generateCardNumber(): string {
  let digits = '4';
  for (let i = 0; i < 15; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

function generateReferenceNumber(prefix = 'TXN'): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
  return `${prefix}-${ts}-${rand}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(days: number, extraMs = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - extraMs);
}

const FICTIONAL_IPS = [
  '198.51.100.23', '203.0.113.45', '192.0.2.77', '198.51.100.101', '203.0.113.212',
  '192.0.2.140', '198.51.100.9', '203.0.113.88',
];

function randomIp() {
  return FICTIONAL_IPS[randomInt(0, FICTIONAL_IPS.length - 1)];
}

interface SeedUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address: string;
  role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';
}

const USERS: SeedUser[] = [
  { username: 'customer01', email: 'aditi.sharma@bankflow-demo.test', password: 'Test@123', fullName: 'Aditi Sharma', phone: '9876500001', address: '12 Lotus Lane, Bengaluru, KA', role: 'CUSTOMER' },
  { username: 'support01', email: 'rohan.verma@bankflow-demo.test', password: 'Test@123', fullName: 'Rohan Verma', phone: '9876500002', address: '4 Support Plaza, Pune, MH', role: 'SUPPORT_AGENT' },
  { username: 'admin01', email: 'priya.nair@bankflow-demo.test', password: 'Admin@123', fullName: 'Priya Nair', phone: '9876500003', address: '1 Admin Tower, Mumbai, MH', role: 'ADMIN' },
  { username: 'customer02', email: 'karan.mehta@bankflow-demo.test', password: 'Test@123', fullName: 'Karan Mehta', phone: '9876500004', address: '78 Maple Street, Delhi, DL', role: 'CUSTOMER' },
  { username: 'customer03', email: 'sneha.iyer@bankflow-demo.test', password: 'Test@123', fullName: 'Sneha Iyer', phone: '9876500005', address: '22 Palm Grove, Chennai, TN', role: 'CUSTOMER' },
  { username: 'customer04', email: 'vikram.singh@bankflow-demo.test', password: 'Test@123', fullName: 'Vikram Singh', phone: '9876500006', address: '9 Ridge Road, Jaipur, RJ', role: 'CUSTOMER' },
  { username: 'customer05', email: 'neha.gupta@bankflow-demo.test', password: 'Test@123', fullName: 'Neha Gupta', phone: '9876500007', address: '56 River View, Kolkata, WB', role: 'CUSTOMER' },
  { username: 'customer06', email: 'arjun.rao@bankflow-demo.test', password: 'Test@123', fullName: 'Arjun Rao', phone: '9876500008', address: '3 Hilltop Colony, Hyderabad, TS', role: 'CUSTOMER' },
  { username: 'customer07', email: 'divya.pillai@bankflow-demo.test', password: 'Test@123', fullName: 'Divya Pillai', phone: '9876500009', address: '18 Garden Court, Kochi, KL', role: 'CUSTOMER' },
  { username: 'customer08', email: 'imran.khan@bankflow-demo.test', password: 'Test@123', fullName: 'Imran Khan', phone: '9876500010', address: '61 Central Avenue, Lucknow, UP', role: 'CUSTOMER' },
];

// customer username -> number of accounts, account types
const ACCOUNT_PLAN: Record<string, Array<'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT'>> = {
  customer01: ['SAVINGS', 'CURRENT', 'FIXED_DEPOSIT'],
  customer02: ['SAVINGS', 'CURRENT'],
  customer03: ['SAVINGS', 'CURRENT'],
  customer04: ['SAVINGS', 'FIXED_DEPOSIT'],
  customer05: ['SAVINGS', 'CURRENT'],
  customer06: ['SAVINGS', 'CURRENT'],
  customer07: ['SAVINGS'],
  customer08: ['SAVINGS'],
};

const BANKS = ['Northgrid Bank', 'MetroCity Bank', 'Union Trust Bank', 'Horizon Bank', 'Coastal Bank'];
const TX_DESCRIPTIONS: Array<{ type: string; description: string; direction: 'DEBIT' | 'CREDIT' }> = [
  { type: 'DEPOSIT', description: 'Salary credit', direction: 'CREDIT' },
  { type: 'DEPOSIT', description: 'Cash deposit at branch', direction: 'CREDIT' },
  { type: 'WITHDRAWAL', description: 'ATM withdrawal', direction: 'DEBIT' },
  { type: 'TRANSFER', description: 'Transfer to beneficiary', direction: 'DEBIT' },
  { type: 'PAYMENT', description: 'Online bill payment', direction: 'DEBIT' },
  { type: 'FEE', description: 'Monthly account maintenance fee', direction: 'DEBIT' },
  { type: 'INTEREST', description: 'Quarterly interest credit', direction: 'CREDIT' },
  { type: 'DEPOSIT', description: 'Refund credit', direction: 'CREDIT' },
  { type: 'WITHDRAWAL', description: 'POS purchase - grocery store', direction: 'DEBIT' },
  { type: 'WITHDRAWAL', description: 'POS purchase - electronics store', direction: 'DEBIT' },
];

export async function seed(): Promise<void> {
  await initPool();
  const client = await getPool().connect();

  try {
    console.log('Truncating existing data...');
    await client.query(`
      TRUNCATE TABLE audit_logs, login_history, otp_codes, documents, notifications, sessions,
      statements, payments, cards, transfers, transactions, beneficiaries, accounts, users, roles
      RESTART IDENTITY CASCADE;
    `);
    await client.query(`TRUNCATE TABLE chaos_config;`);

    console.log('Inserting roles...');
    const roleIds: Record<string, number> = {};
    for (const name of ['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN']) {
      const { rows } = await client.query('INSERT INTO roles (name) VALUES ($1) RETURNING id', [name]);
      roleIds[name] = rows[0].id;
    }

    console.log('Inserting users...');
    const userIds: Record<string, string> = {};
    for (const u of USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const { rows } = await client.query(
        `INSERT INTO users (username, email, password_hash, full_name, phone, address, role_id, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
        [u.username, u.email, passwordHash, u.fullName, u.phone, u.address, roleIds[u.role]],
      );
      userIds[u.username] = rows[0].id;
    }

    console.log('Inserting accounts...');
    const accountsByUser: Record<string, string[]> = {};
    const allAccountIds: string[] = [];
    for (const [username, types] of Object.entries(ACCOUNT_PLAN)) {
      accountsByUser[username] = [];
      for (const accountType of types) {
        const balance = randomAmount(15000, 650000);
        const interestRate = accountType === 'FIXED_DEPOSIT' ? 6.5 : accountType === 'SAVINGS' ? 3.5 : 0;
        const { rows } = await client.query(
          `INSERT INTO accounts (account_number, user_id, account_type, currency, available_balance, current_balance, interest_rate, opened_at)
           VALUES ($1, $2, $3, 'INR', $4, $4, $5, $6) RETURNING id`,
          [generateAccountNumber(), userIds[username], accountType, balance, interestRate, daysAgo(randomInt(120, 900))],
        );
        accountsByUser[username].push(rows[0].id);
        allAccountIds.push(rows[0].id);
      }
    }

    console.log('Inserting transactions...');
    for (const accountId of allAccountIds) {
      const count = randomInt(7, 12);
      let runningBalance = randomAmount(15000, 650000);
      for (let i = 0; i < count; i++) {
        const template = TX_DESCRIPTIONS[randomInt(0, TX_DESCRIPTIONS.length - 1)];
        const amount = randomAmount(150, 45000);
        runningBalance = template.direction === 'CREDIT' ? runningBalance + amount : runningBalance - amount;
        const statusRoll = Math.random();
        const status = statusRoll < 0.88 ? 'SUCCESS' : statusRoll < 0.94 ? 'PENDING' : statusRoll < 0.98 ? 'FAILED' : 'REVERSED';
        await client.query(
          `INSERT INTO transactions (account_id, type, description, amount, direction, status, counterparty_name, reference_number, balance_after, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            accountId,
            template.type,
            template.description,
            amount,
            template.direction,
            status,
            template.type === 'TRANSFER' ? BANKS[randomInt(0, BANKS.length - 1)] + ' customer' : null,
            generateReferenceNumber(template.type.slice(0, 3)),
            Math.max(0, Math.round(runningBalance * 100) / 100),
            daysAgo(randomInt(0, 75), randomInt(0, 86_400_000)),
          ],
        );
      }
    }

    console.log('Inserting beneficiaries...');
    const beneficiaryNames = [
      'Meera Krishnan', 'Suresh Babu', 'Ananya Das', 'Farhan Ali', 'Ritu Chawla', 'Sanjay Kapoor',
      'Lakshmi Menon', 'Deepak Joshi', 'Pooja Reddy', 'Manish Agarwal', 'Kavita Bhatt', 'Rahul Saxena',
      'Nisha Thakur', 'Amit Malhotra', 'Swati Kulkarni', 'Vivek Shetty', 'Anjali Bose', 'Gaurav Chandra',
      'Priyanka Nambiar', 'Tarun Sethi',
    ];
    const customerUsernames = USERS.filter((u) => u.role === 'CUSTOMER').map((u) => u.username);
    for (let i = 0; i < beneficiaryNames.length; i++) {
      const owner = customerUsernames[i % customerUsernames.length];
      await client.query(
        `INSERT INTO beneficiaries (user_id, name, nickname, account_number, bank_name, ifsc, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userIds[owner],
          beneficiaryNames[i],
          i % 3 === 0 ? beneficiaryNames[i].split(' ')[0] : null,
          generateAccountNumber(),
          BANKS[randomInt(0, BANKS.length - 1)],
          `${['HDFC', 'ICIC', 'SBIN', 'AXIS', 'UTIB'][randomInt(0, 4)]}0${randomInt(100000, 999999)}`,
          Math.random() < 0.85 ? 'ACTIVE' : 'INACTIVE',
        ],
      );
    }

    console.log('Inserting cards...');
    for (const username of customerUsernames) {
      const accountIds = accountsByUser[username];
      const cardCount = username === 'customer01' ? 2 : 1;
      for (let i = 0; i < cardCount; i++) {
        const cardType = i === 1 ? 'CREDIT' : 'DEBIT';
        const creditLimit = cardType === 'CREDIT' ? randomAmount(50000, 300000) : null;
        await client.query(
          `INSERT INTO cards (user_id, account_id, card_type, card_number, card_holder_name, expiry_month, expiry_year, status, credit_limit, available_limit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $8)`,
          [
            userIds[username],
            accountIds[0],
            cardType,
            generateCardNumber(),
            USERS.find((u) => u.username === username)!.fullName.toUpperCase(),
            randomInt(1, 12),
            new Date().getFullYear() + randomInt(2, 5),
            creditLimit,
          ],
        );
      }
    }

    console.log('Inserting notifications...');
    const notificationTemplates: Array<{ title: string; message: string; type: string }> = [
      { title: 'Transfer successful', message: '₹5,000 transferred successfully to Meera Krishnan.', type: 'SUCCESS' },
      { title: 'Statement ready', message: 'Your monthly statement is ready to download.', type: 'INFO' },
      { title: 'New beneficiary added', message: 'Suresh Babu was added to your beneficiary list.', type: 'SUCCESS' },
      { title: 'Suspicious login detected', message: 'A login was detected from a new device in Pune.', type: 'SECURITY' },
      { title: 'Bill payment due', message: 'Your electricity bill of ₹1,240 is due in 3 days.', type: 'WARNING' },
      { title: 'Card limit updated', message: 'Your credit card limit was updated successfully.', type: 'INFO' },
    ];
    for (let i = 0; i < 20; i++) {
      const owner = customerUsernames[i % customerUsernames.length];
      const t = notificationTemplates[i % notificationTemplates.length];
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userIds[owner], t.title, t.message, t.type, i % 3 === 0, daysAgo(randomInt(0, 20))],
      );
    }

    console.log('Inserting payment records...');
    const categories = ['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE'];
    const billers = ['Northgrid Power Co.', 'Orbit Mobile', 'FiberStream Broadband', 'City Water Board', 'BankFlow Credit Card', 'Sureway Life Insurance'];
    for (let i = 0; i < 15; i++) {
      const owner = customerUsernames[i % customerUsernames.length];
      const accountId = accountsByUser[owner][0];
      const statusRoll = Math.random();
      await client.query(
        `INSERT INTO payments (user_id, account_id, category, biller_name, consumer_number, amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userIds[owner],
          accountId,
          categories[i % categories.length],
          billers[i % billers.length],
          `CN${randomInt(100000, 999999)}`,
          randomAmount(200, 5000),
          statusRoll < 0.85 ? 'SUCCESS' : statusRoll < 0.95 ? 'PENDING' : 'FAILED',
          daysAgo(randomInt(0, 40)),
        ],
      );
    }

    console.log('Inserting login history + audit logs...');
    for (const u of USERS) {
      for (let i = 0; i < randomInt(4, 8); i++) {
        const success = Math.random() > 0.15;
        await client.query(
          `INSERT INTO login_history (user_id, username_attempted, ip_address, user_agent, status, reason, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userIds[u.username],
            u.username,
            randomIp(),
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BankFlowDemoAgent/1.0',
            success ? 'SUCCESS' : 'FAILED',
            success ? null : 'BAD_PASSWORD',
            daysAgo(randomInt(0, 30)),
          ],
        );
      }
      await client.query(
        `INSERT INTO audit_logs (actor_user_id, actor_username, action, target, ip_address, result, metadata, created_at)
         VALUES ($1, $2, 'LOGIN_SUCCESS', $2, $3, 'SUCCESS', '{}', $4)`,
        [userIds[u.username], u.username, randomIp(), daysAgo(randomInt(0, 15))],
      );
    }
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, actor_username, action, target, ip_address, result, metadata, created_at)
       VALUES ($1, 'admin01', 'ADMIN_SET_USER_LOCKED', 'customer05', $2, 'SUCCESS', '{"reason":"suspicious activity"}', $3)`,
      [userIds.admin01, randomIp(), daysAgo(5)],
    );

    console.log('Seed complete.');
    console.log('Test credentials:');
    console.log('  customer01 / Test@123 (CUSTOMER)');
    console.log('  support01  / Test@123 (SUPPORT_AGENT)');
    console.log('  admin01    / Admin@123 (ADMIN)');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
