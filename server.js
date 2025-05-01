require('dotenv').config();
const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');

// Load SMTP Accounts
const smtpAccounts = JSON.parse(fs.readFileSync(path.join(__dirname, 'smtp_accounts.json'), 'utf8'));

// Circuit-break and failure tracking
const FAILURE_THRESHOLD = 3; // failures before ban
const failureCounts = new Map();
const bannedUntil = new Map();

// Header pool for randomization
const injectedByOptions = [
  'XMailer Engine v2.1',
  'Injected via Titan Node',
  'X-Relay: CustomMailRelay',
  'MailerAgent-Pro SMTP',
  'Cloud Dispatch Unit',
  'MailOps Tasker',
  'Auth-Bridge Relayer',
  'SMTP Core Daemon',
  'IngestPipeline 3.7.5',
  'XSource MailRouter'
];

// Helper: Generate a random subdomain
function generateRandomSubdomain(baseDomain) {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${randomPart}.${baseDomain}`;
}

// Helper: Pick a usable SMTP account
function availableSMTPs() {
  const now = Date.now();
  return smtpAccounts.filter(a => {
    const ban = bannedUntil.get(a.auth.user);
    return !ban || ban < now;
  });
}

// Helper: Log bad SMTP account
const logBadSMTP = (account) => {
  try {
    const file = path.join(__dirname, 'bad_smtp_accounts.txt');
    fs.appendFileSync(file, `${new Date().toISOString()} ${account}\n`, { flag: 'a' });
  } catch (err) {
    console.error(`❌ Failed to write bad SMTP account: ${err.message}`);
  }
};

// Helper: Send email with retry on failure
const attemptSend = async (parsed, toAddresses, attempts = 0) => {
  const avail = availableSMTPs();
  if (!avail.length || attempts >= smtpAccounts.length) {
    throw new Error('All SMTP accounts failed or are banned');
  }
  const randomSMTP = avail[Math.floor(Math.random() * avail.length)];

  // Circuit-break
  const user = randomSMTP.auth.user;

  const randomOriginatedSubdomain = generateRandomSubdomain('devpilgrim.net');
  const uniqueMessageId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  const transporter = nodemailer.createTransport({
    pool: true,
    host: randomSMTP.host,
    port: randomSMTP.port,
    secure: randomSMTP.secure,
    auth: randomSMTP.auth,
    name: randomOriginatedSubdomain,
    tls: { rejectUnauthorized: false },
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1', 10),
    maxMessages: parseInt(process.env.MAX_MESSAGES || '1', 10),
    keepAlive: false,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    logger: true,
    debug: true
  });

  // Verify at first use
  if (attempts === 0) {
    transporter.verify(err => {
      if (err) console.warn(`⚠️ SMTP verify failed for ${user}: ${err.message}`);
      else console.log(`✅ SMTP verify OK: ${user}`);
    });
  }

  // Random header selection
  const injectedHeader = injectedByOptions[Math.floor(Math.random() * injectedByOptions.length)];

  try {
    await transporter.sendMail({
      from: `"${(parsed.from?.value?.[0]?.name || 'No Name').replace(/"/g, "'")}" <${user}>`,
      to: toAddresses,
      subject: parsed.subject || '(No Subject)',
      text: parsed.text || '',
      html: parsed.html || '',
      envelope: { from: user, to: toAddresses },
      headers: {
        'X-Injected-By': injectedHeader,
        'X-Originating-IP': randomOriginatedSubdomain,
        'Message-ID': `<${uniqueMessageId}@${randomOriginatedSubdomain}>`
      }
    });
    console.log(`✅ Email relayed through: ${user}`);
    // reset failure count
    failureCounts.set(user, 0);
  } catch (err) {
    console.error(`❌ ${user} error: ${err.responseCode || ''} ${err.message}`);
    // If 550 spam content, do not retry
    if (err.responseCode === 550 && /spam/i.test(err.message)) {
      console.warn(`🚫 ${user} flagged for spam — skipping retry.`);
      return;
    }
    // track failure
    const count = (failureCounts.get(user) || 0) + 1;
    failureCounts.set(user, count);
    if (count >= FAILURE_THRESHOLD) {
      const banDuration = 5 * 60 * 1000; // 5 minutes
      bannedUntil.set(user, Date.now() + banDuration);
      console.warn(`🚫 Banning ${user} for ${banDuration/60000}m`);
      logBadSMTP(user);
    }
    // handle 421 with backoff
    if (err.responseCode === 421) {
      const backoff = Math.min(60000, 1000 * 2 ** attempts);
      console.warn(`⏱️ Backing off for ${backoff/1000}s before retry`);
      await new Promise(r => setTimeout(r, backoff));
    }
    return attemptSend(parsed, toAddresses, attempts + 1);
  }
};

// Create SMTP Server
const server = new SMTPServer({
  secure: false,
  key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
  authOptional: false,
  onAuth(auth, session, cb) {
    if (auth.username === process.env.AUTH_USER && auth.password === process.env.AUTH_PASS) {
      return cb(null, { user: auth.username });
    }
    return cb(new Error('Invalid credentials'));
  },
  async onData(stream, session, cb) {
    let emailData = '';
    stream.on('data', chunk => (emailData += chunk.toString()));
    stream.on('end', async () => {
      let parsed;
      try {
        parsed = await simpleParser(emailData);
      } catch (e) {
        console.error('❌ Parse failed:', e.message);
        return cb(e);
      }
      const toAddresses = session.envelope.rcptTo.map(r => r.address);
      try {
        await attemptSend(parsed, toAddresses);
      } catch (e) {
        console.error('❌ Delivery failed:', e.message);
      }
      cb();
    });
  }
});

// Start server
server.listen(process.env.PORT || 2525, () => console.log(`🚀 Listening on port ${process.env.PORT||2525}`));
