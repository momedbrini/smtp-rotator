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

