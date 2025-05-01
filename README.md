# 📬 SMTP Rotator Relay (Node.js)

This project is a lightweight SMTP relay server built in Node.js. It rotates between multiple SMTP accounts (e.g., Suddenlink), supports TLS, and includes:

- ✅ Account rotation
- ✅ TLS (STARTTLS) support
- ✅ Randomized headers for stealth
- ✅ Automatic failure handling & banning
- ✅ PM2 support for background running

---

## 🔧 Features

- Rotates authenticated SMTP accounts from `smtp_accounts.json`
- TLS enabled via `STARTTLS` using `certs/key.pem` and `certs/cert.pem`
- Circuit-break logic to ban bad accounts temporarily
- Integrates with apps like **Listmonk**, **PowerMTA**, or other SMTP senders

---

## 📁 Project Structure

smtp-rotator/ 
├── server.js # Main SMTP rotator script 
├── smtp_accounts.json # List of SMTP credentials 
├── .env # Environment variables 
├── certs/ # TLS certs 
│ ├── key.pem 
│ └── cert.pem


---

## 📦 Dependencies

- Node.js (v16+ recommended)
- npm
- pm2
- smtp-server
- mailparser
- nodemailer
- dotenv

---

## 🔐 Example `.env`

```env
PORT=2525
AUTH_USER=myuser
AUTH_PASS=mypassword
MAX_CONNECTIONS=1
MAX_MESSAGES=1
```

🔑 Example smtp_accounts.json
```smtp_accounts.json
[
  {
    "host": "smtp.suddenlink.net",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "example@suddenlink.net",
      "pass": "yourpassword"
    }
  },
  {
    "host": "smtp.suddenlink.net",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "other@suddenlink.net",
      "pass": "anotherpass"
    }
  }
]
```

