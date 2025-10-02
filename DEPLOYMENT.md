# 🚀 Deploy Rucking NRC App Online

## Simple Steps to Deploy (Like Teaching a Kid!)

---

## Part 1: Deploy Backend (The Kitchen) 👨‍🍳

### Using Railway (FREE):

1. **Go to:** https://railway.app
2. **Click:** "Start a New Project"
3. **Sign in** with GitHub (create account if needed)
4. **Click:** "Deploy from GitHub repo"
5. **Select:** Your `rucking-nrc` repository
6. **Important:** Set root directory to `server` folder
7. **Click:** Deploy

**After deployment:**
- Railway will give you a URL like: `https://rucking-nrc-production.up.railway.app`
- **Copy this URL!** You'll need it!

---

## Part 2: Update Frontend to Use Online Backend

1. Open file: `src/services/api.js`
2. Change this line:
   ```js
   const API_URL = 'http://localhost:3001/api';
   ```
   To:
   ```js
   const API_URL = 'https://YOUR-RAILWAY-URL.railway.app/api';
   ```
   (Replace with your actual Railway URL)

---

## Part 3: Deploy Frontend (The Menu) 📱

### Using Vercel (FREE):

1. **Go to:** https://vercel.com
2. **Sign in** with GitHub
3. **Click:** "New Project"
4. **Import** your `rucking-nrc` repository
5. **Click:** Deploy

**After deployment:**
- Vercel gives you a URL like: `https://rucking-nrc.vercel.app`
- **Open this URL on your iPhone!** 🎉

---

## Part 4: Use on iPhone

1. **Open Safari** on iPhone
2. **Go to:** Your Vercel URL (like `https://rucking-nrc.vercel.app`)
3. **Tap Share button** → "Add to Home Screen"
4. **Done!** You have a real app icon! 📱

---

## Alternative: Easier Way (No GitHub needed)

**I can help you deploy using CLI commands!** Just tell me and I'll guide you step-by-step.

---

## What You'll Get:

✅ **Your app works anywhere** (no WiFi needed)
✅ **Real URL** you can share
✅ **Works on any phone** (iPhone, Android)
✅ **Free forever** (both Railway & Vercel have free tiers)

---

## Need Help?

Just ask! I'll deploy it for you step-by-step! 🚀
