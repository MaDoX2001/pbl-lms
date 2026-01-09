# Deployment Guide - PBL LMS with 2FA

## Quick Deploy to Production

### 1. MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Your database is already created: `madrox.u8jh8xr.mongodb.net/pbl-lms`
3. Connection string is in `backend/.env`
4. **Already configured! ✅**

### 2. Deploy Backend to Render

#### Option A: Automatic Deploy
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub: `https://github.com/MaDoX2001/pbl-lms`
4. Configure:
   - **Name**: `pbl-lms-backend`
   - **Region**: Frankfurt (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

5. **Environment Variables** (Add these in Render):
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://maaadooo2001_db_user:XBn6XqKXsSbI57uP@madrox.u8jh8xr.mongodb.net/pbl-lms?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
   JWT_EXPIRE=7d
   CLIENT_URL=https://your-frontend-url.vercel.app
   EMAIL_SERVICE=gmail
   EMAIL_USER=maaadooo2001.3@gmail.com
   EMAIL_PASSWORD=orzfpxypgfxejbxv
   EMAIL_FROM_NAME=منصة التعلم بالمشروعات
   ```

6. Click **"Create Web Service"**
7. Wait for deployment (~5 minutes)
8. Copy your backend URL: `https://pbl-lms-backend.onrender.com`

#### Option B: Using render.yaml
```bash
# Deploy using blueprint (already configured)
render deploy
```

### 3. Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import `https://github.com/MaDoX2001/pbl-lms`
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Environment Variables** (Add in Vercel):
   ```
   VITE_API_URL=https://pbl-lms-backend.onrender.com/api
   ```

6. Click **"Deploy"**
7. Wait for deployment (~2 minutes)
8. Your site will be live at: `https://pbl-lms-xxxxx.vercel.app`

### 4. Update Backend with Frontend URL

1. Go back to Render backend settings
2. Update `CLIENT_URL` environment variable:
   ```
   CLIENT_URL=https://pbl-lms-xxxxx.vercel.app
   ```
3. Restart backend service

### 5. Test 2FA Setup

1. Visit your frontend URL
2. Register a new account (you'll need an invitation)
3. After login, you'll be redirected to 2FA setup
4. Scan QR code with Google Authenticator
5. Enter 6-digit code to complete setup
6. Done! ✅

---

## Environment Variables Reference

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://maaadooo2001_db_user:XBn6XqKXsSbI57uP@madrox.u8jh8xr.mongodb.net/pbl-lms?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
JWT_EXPIRE=7d
CLIENT_URL=https://your-vercel-app.vercel.app
EMAIL_SERVICE=gmail
EMAIL_USER=maaadooo2001.3@gmail.com
EMAIL_PASSWORD=orzfpxypgfxejbxv
EMAIL_FROM_NAME=منصة التعلم بالمشروعات
```

### Frontend (.env)
```env
VITE_API_URL=https://pbl-lms-backend.onrender.com/api
```

---

## Deployment Checklist

- ✅ MongoDB Atlas connected
- ✅ Backend deployed to Render
- ✅ Frontend deployed to Vercel
- ✅ Environment variables configured
- ✅ CORS settings updated
- ✅ 2FA working with speakeasy
- ✅ Email service configured

---

## Troubleshooting

### Issue: "CORS Error"
**Solution**: Make sure `CLIENT_URL` in backend matches your Vercel URL exactly

### Issue: "Cannot connect to database"
**Solution**: Check MongoDB Atlas whitelist - add `0.0.0.0/0` for all IPs

### Issue: "2FA QR code not showing"
**Solution**: Check browser console, ensure backend URL is correct in frontend env

### Issue: "Email not sending"
**Solution**: Verify `EMAIL_PASSWORD` is an App Password from Gmail (not regular password)

---

## One-Click Deploy URLs

### Deploy Backend to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://dashboard.render.com/blueprint/new?repo=https://github.com/MaDoX2001/pbl-lms)

### Deploy Frontend to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MaDoX2001/pbl-lms/tree/main/frontend)

---

## Post-Deployment

1. **Create Admin Account**:
   ```bash
   # Use the seed script or create invitation manually
   node backend/scripts/seed.js
   ```

2. **Test Complete Flow**:
   - Register → 2FA Setup → Login → 2FA Verify → Dashboard

3. **Monitor**:
   - Render Dashboard: https://dashboard.render.com
   - Vercel Dashboard: https://vercel.com/dashboard
   - MongoDB Atlas: https://cloud.mongodb.com

---

## Support

- Backend Repository: https://github.com/MaDoX2001/pbl-lms
- MongoDB: mongodb+srv://madrox.u8jh8xr.mongodb.net/pbl-lms
- Email: maaadooo2001.3@gmail.com

**Everything is configured and ready to deploy! Just follow the steps above.** 🚀
