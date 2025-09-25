# 🌐 Domain Setup Instructions for valuerpro.online

## Overview
Setting up `valuerpro.online` with professional subdomain structure:
- **Frontend**: `https://valuerpro.online` (Vercel)
- **API**: `https://api.valuerpro.online` (Railway)

---

## 🎯 Step 1: Squarespace DNS Configuration

**In your Squarespace domain settings**, add these DNS records:

### A Record (Main Domain)
```
Type: A
Name: @
Value: 76.76.19.61
TTL: Auto
```

### CNAME Records
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com.
TTL: Auto

Type: CNAME
Name: api
Value: [Your Railway Domain - see step 2]
TTL: Auto
```

---

## 🚀 Step 2: Railway Backend Domain Setup

1. **Go to Railway Dashboard**:
   - Navigate to your backend project
   - Go to Settings → Domains

2. **Add Custom Domain**:
   - Click "Add Domain"
   - Enter: `api.valuerpro.online`
   - Copy the CNAME target provided (usually ends with `.railway.app`)

3. **Update Squarespace DNS**:
   - Replace `[Your Railway Domain - see step 2]` in the CNAME record above
   - With the CNAME target from Railway

---

## 📱 Step 3: Vercel Frontend Domain Setup

1. **Go to Vercel Dashboard**:
   - Navigate to your location-maps project
   - Go to Settings → Domains

2. **Add Domains**:
   ```
   Domain: valuerpro.online
   Domain: www.valuerpro.online (redirect to main)
   ```

3. **Set Environment Variables** in Vercel:
   - Go to Settings → Environment Variables
   - Add for Production:
     ```
     REACT_APP_API_URL = https://api.valuerpro.online/api
     ```

---

## ⚙️ Step 4: Environment Configuration

### Frontend Production Environment
The file `frontend/.env.production` has been created with:
```env
REACT_APP_API_URL=https://api.valuerpro.online/api
REACT_APP_APP_NAME=ValuerPro Location Intelligence
```

### Backend CORS Update
Updated `backend/server.js` to allow:
- `https://valuerpro.online`
- `https://www.valuerpro.online`

---

## 🔍 Step 5: Verification

After DNS propagation (15 minutes - 2 hours):

### Test Frontend
```bash
curl -I https://valuerpro.online
# Should return: HTTP/2 200
```

### Test API
```bash
curl https://api.valuerpro.online/api/health
# Should return: {"success":true,"data":{"status":"healthy"...}}
```

### Test CORS
```bash
curl -H "Origin: https://valuerpro.online" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.valuerpro.online/api/location/analyze
# Should include: Access-Control-Allow-Origin: https://valuerpro.online
```

---

## 🛠️ Troubleshooting

### DNS Not Propagating
- Check with: `nslookup valuerpro.online`
- DNS changes take 15 minutes to 24 hours
- Clear browser cache: Ctrl+Shift+R

### SSL Certificate Issues
- Both Vercel and Railway provide automatic SSL
- Wait 10-15 minutes after domain setup
- Check certificate: `https://www.ssllabs.com/ssltest/`

### CORS Errors
- Verify domain exactly matches CORS settings
- Check browser console for specific errors
- Ensure no trailing slashes in domain configuration

---

## 📋 Completion Checklist

- [ ] DNS A record added for valuerpro.online → 76.76.19.61
- [ ] CNAME added for www.valuerpro.online → cname.vercel-dns.com
- [ ] CNAME added for api.valuerpro.online → [railway-domain]
- [ ] Railway custom domain configured
- [ ] Vercel custom domains configured
- [ ] Environment variables set in Vercel
- [ ] Frontend builds successfully
- [ ] Backend API accessible via custom domain
- [ ] CORS working between custom domains
- [ ] SSL certificates active on both domains

---

## 🎉 Post-Setup

Once complete, your professional URLs will be:
- **App**: https://valuerpro.online
- **API Docs**: https://api.valuerpro.online
- **Health Check**: https://api.valuerpro.online/api/health

**DNS propagation typically takes 15-30 minutes. After that, your Location Intelligence app will be live on your professional domain!** 🚀