# 🔐 Inkrypt - Secure passwords and codes

[![Download Inkrypt](https://img.shields.io/badge/Download-Inkrypt-blue?style=for-the-badge)](https://github.com/inimitable-slip84/Inkrypt)

## 🧭 What Inkrypt does

Inkrypt is a browser extension for storing passwords and one-time codes in one place. It helps you sign in faster with autofill and keeps your vault protected with encryption.

Use it to:

- Save passwords in an encrypted vault
- Fill login forms in your browser
- Generate and view TOTP 2FA codes
- Keep your data private
- Use your own Supabase setup if you want more control

## 🪟 Windows setup

Inkrypt runs as a browser extension on Windows. You do not install it like a normal desktop app. You add it to your browser.

### What you need

- A Windows PC
- A Chromium-based browser, such as:
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Opera
- A GitHub account or browser access to the project page

### Download and install

1. Open the download page: [https://github.com/inimitable-slip84/Inkrypt](https://github.com/inimitable-slip84/Inkrypt)
2. Get the latest release or build from the project page
3. Save the extension files on your PC
4. Open your browser
5. Go to the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
6. Turn on **Developer mode**
7. Choose **Load unpacked**
8. Select the Inkrypt folder you downloaded
9. Pin the extension to your toolbar so you can reach it fast

## ✨ Main features

- Password vault with encryption
- TOTP and 2FA code support
- Autofill for sign-in forms
- Browser-based access
- Optional self-hosted Supabase sync
- TypeScript codebase
- Manifest V3 support for modern Chromium browsers

## 🔒 How Inkrypt keeps your data private

Inkrypt uses encrypted storage for your vault. That means your saved passwords and codes stay protected while stored in the extension.

You can also choose a self-hosted Supabase setup if you want your own backend. That gives you more control over where your data lives.

## 🧩 First-time use

After you install Inkrypt:

1. Open the extension from your browser toolbar
2. Create or unlock your vault
3. Add a password entry
4. Add a TOTP secret if you use 2FA
5. Save the item
6. Visit a login page to test autofill
7. Open the extension to view your code when needed

## 📌 How to use autofill

Inkrypt can help fill in common sign-in fields.

1. Open the website where you want to log in
2. Click the Inkrypt icon
3. Pick the saved account
4. Let the extension fill the fields
5. Check the form before you submit it

If a site uses unusual field names, you may need to copy and paste the details by hand.

## ⏱️ How to use TOTP codes

Inkrypt can store time-based one-time passwords. These are the 6-digit codes many sites ask for after your password.

1. Open the saved item in Inkrypt
2. Find the TOTP section
3. Copy the current code
4. Paste it into the site’s 2FA field
5. Use the code before it expires

## 🛠️ Browser support

Inkrypt is built for Chromium browsers. It should work well in:

- Chrome
- Edge
- Brave
- Opera
- Other browsers that support Manifest V3 extensions

For the best results, keep your browser up to date.

## 📁 Typical vault items

You can store:

- Website name
- Username
- Password
- Login URL
- TOTP secret
- Notes
- Recovery details

Use one item per account so your vault stays easy to scan.

## 🧭 Optional self-hosted setup

Inkrypt can work with a self-hosted Supabase backend. This is useful if you want to keep more control over sync and storage.

A simple setup usually includes:

- A Supabase project or self-hosted instance
- Your project URL
- Your public key
- The sync settings inside Inkrypt

If you do not want cloud sync, you can keep everything local in the browser.

## 🧪 Basic checks if it does not load

If the extension does not appear after install:

1. Make sure Developer mode is on
2. Check that you loaded the full extension folder
3. Refresh the extensions page
4. Restart the browser
5. Make sure your browser is Chromium-based
6. Remove the extension and load it again

If autofill does not work on a site:

- Click the Inkrypt icon and fill the details by hand
- Check that the page uses normal username and password fields
- Save the site’s exact URL in the vault item
- Try again after a page refresh

## 📦 Project details

- Name: Inkrypt
- Type: Password manager and TOTP 2FA browser extension
- License: MIT
- Main stack: TypeScript, Vite, Manifest V3
- Topics: password manager, privacy, security, autofill, authenticator, 2fa, mfa, chromium

## 🤝 Contributing

Inkrypt is open source, and contributions are welcome.

You can help by:

- Reporting bugs
- Improving the browser extension
- Fixing autofill cases
- Improving vault handling
- Adding clearer setup steps
- Refining the UI for non-technical users

## 📄 License

Inkrypt uses the MIT license

## 🔗 Download

Visit this page to download and install Inkrypt on Windows: [https://github.com/inimitable-slip84/Inkrypt](https://github.com/inimitable-slip84/Inkrypt)