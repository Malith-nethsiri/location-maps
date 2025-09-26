# ValuerPro Deployment Guide

## 🚀 Complete Deployment Instructions

### 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Vercel Account** - For frontend deployment
3. **Railway Account** - For backend and database deployment
4. **Google Cloud Account** - For Google Maps API
5. **OpenAI Account** - For AI features

---

## 🗄️ Database Setup (Railway)

### Step 1: Create Railway Database

1. **Login to Railway** → https://railway.app
2. **Create New Project** → Select "Empty Project"
3. **Add Database** → Click "New" → "Database" → "PostgreSQL"
4. **Enable PostGIS**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Step 2: Import Database Schema

1. **Connect to Railway Database**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login to Railway
   railway login

   # Connect to your project
   railway link

   # Connect to database
   railway connect
   ```

2. **Import Schema**:
   ```bash
   # Upload and execute the schema
   psql $DATABASE_URL -f database-schema.sql
   ```

3. **Alternative: Use Railway Web Interface**:
   - Go to your database service in Railway
   - Open "Query" tab
   - Copy and paste the entire `database-schema.sql` content
   - Execute the query

### Step 3: Get Database Connection String

Copy the `DATABASE_URL` from Railway dashboard - you'll need this for backend deployment.

---

## 🔧 Backend Deployment (Railway)

### Step 1: Prepare Backend for Railway

1. **Update package.json** (already configured):
   ```json
   {
     "scripts": {
       "start": "node server.js",
       "build": "echo 'Build complete'"
     },
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

### Step 2: Deploy to Railway

1. **Create Railway Service**:
   - In your Railway project, click "New" → "GitHub Repo"
   - Connect your GitHub repository
   - Select the backend folder path: `/backend`

2. **Configure Environment Variables**:
   Go to your Railway backend service → "Variables" tab and add:

   ```bash
   # Required Variables
   DATABASE_URL=postgresql://...  # From Railway database
   GOOGLE_MAPS_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret_min_32_chars
   NODE_ENV=production
   ADMIN_API_KEY=your_admin_api_key

   # CORS Configuration
   CORS_ORIGIN=https://your-frontend-domain.vercel.app

   # Optional but Recommended
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

3. **Deploy**:
   - Railway will automatically deploy when you push to GitHub
   - Monitor deployment in Railway dashboard

### Step 3: Get Backend URL

Copy your Railway backend URL - you'll need this for frontend configuration.

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Vercel

1. **Update package.json** (already configured):
   ```json
   {
     "scripts": {
       "build": "react-scripts build",
       "start": "react-scripts start"
     }
   }
   ```

2. **Remove proxy from package.json** for production:
   ```json
   // Remove this line for production:
   // "proxy": "http://localhost:3001"
   ```

### Step 2: Configure Environment Variables

Create `.env.production` in frontend folder:

```bash
# Frontend Environment Variables
REACT_APP_API_URL=https://your-railway-backend-url.railway.app
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_APP_NAME=ValuerPro
REACT_APP_VERSION=1.0.0
```

### Step 3: Deploy to Vercel

1. **Connect to Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the frontend folder: `/frontend`

2. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

3. **Add Environment Variables** in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`

4. **Deploy**:
   - Vercel will automatically deploy
   - Get your deployment URL

---

## 🔑 API Keys Setup

### Google Maps API

1. **Google Cloud Console** → https://console.cloud.google.com
2. **Enable APIs**:
   - Maps JavaScript API
   - Geocoding API
   - Places API
   - Routes API (2025)
   - Maps Static API

3. **Create API Key**:
   - Go to "Credentials"
   - Create API Key
   - Restrict to your domains
   - Copy key for environment variables

### OpenAI API

1. **OpenAI Platform** → https://platform.openai.com
2. **Create API Key**:
   - Go to "API Keys"
   - Create new secret key
   - Copy for environment variables

---

## 🔒 Security Configuration

### Update CORS Origins

In Railway backend environment variables:

```bash
CORS_ORIGIN=https://your-vercel-domain.vercel.app,https://valuerpro.online
```

### Generate Secure Secrets

```bash
# Generate JWT Secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)

# Generate Admin API Key
ADMIN_API_KEY=$(openssl rand -base64 24)
```

---

## 🚦 Domain Configuration (Optional)

### Custom Domain Setup

1. **Vercel Custom Domain**:
   - Go to Project Settings → Domains
   - Add your custom domain (e.g., valuerpro.online)
   - Configure DNS records as instructed

2. **Update Environment Variables**:
   ```bash
   # In Railway backend
   CORS_ORIGIN=https://valuerpro.online

   # In Vercel frontend
   REACT_APP_API_URL=https://your-railway-backend.railway.app
   ```

---

## 📊 Monitoring Setup

### Health Check Endpoints

Your deployed backend will have these endpoints:

```bash
# Basic health check
GET https://your-railway-backend.railway.app/api/health

# Detailed health check
GET https://your-railway-backend.railway.app/api/health/detailed

# Metrics (requires ADMIN_API_KEY)
GET https://your-railway-backend.railway.app/api/health/metrics
Headers: X-API-Key: your_admin_api_key
```

### Set Up Monitoring

1. **Railway Dashboard** - Monitor backend performance
2. **Vercel Analytics** - Monitor frontend performance
3. **Custom Monitoring** - Use health endpoints for external monitoring

---

## 🧪 Testing Deployment

### 1. Test Backend Health

```bash
curl https://your-railway-backend.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "ai": "available",
    "monitoring": "active"
  }
}
```

### 2. Test Frontend

1. Visit your Vercel URL
2. Try creating a test report
3. Check console for any API connection errors

### 3. Test Database

```bash
# Using Railway CLI
railway connect

# Test query
SELECT COUNT(*) FROM users;
```

---

## 🔄 Database Updates

### Using Railway CLI

```bash
# Connect to Railway
railway login
railway link

# Connect to database
railway connect

# Run migrations
\i path/to/migration.sql

# Or use psql
psql $DATABASE_URL -f migration.sql
```

### Manual Updates via Railway Dashboard

1. Go to Railway → Your Database Service
2. Click "Query" tab
3. Execute SQL commands directly

---

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check CORS_ORIGIN in Railway backend
   - Ensure frontend URL is correct

2. **Database Connection**:
   - Verify DATABASE_URL in Railway
   - Check PostGIS extension is enabled

3. **API Key Issues**:
   - Verify all API keys are set in Railway
   - Check API key restrictions in Google Cloud

4. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are listed in package.json

### Debug Commands

```bash
# Check Railway logs
railway logs

# Check Vercel deployment logs
# Use Vercel dashboard Functions tab

# Test database connection
railway run psql $DATABASE_URL -c "SELECT version();"
```

---

## 📝 Environment Variables Checklist

### Railway Backend

- [ ] `DATABASE_URL`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `JWT_SECRET`
- [ ] `NODE_ENV=production`
- [ ] `ADMIN_API_KEY`
- [ ] `CORS_ORIGIN`

### Vercel Frontend

- [ ] `REACT_APP_API_URL`
- [ ] `REACT_APP_GOOGLE_MAPS_API_KEY`
- [ ] `REACT_APP_APP_NAME`

---

## 🎉 Post-Deployment

1. **Test Complete Workflow**:
   - User registration
   - Report creation from coordinates
   - AI content generation
   - PDF generation
   - Image upload

2. **Monitor Performance**:
   - Check health endpoints regularly
   - Monitor API usage in Google Cloud
   - Monitor AI costs in OpenAI dashboard

3. **Set Up Backups**:
   - Railway provides automatic backups
   - Consider additional backup strategies for production

4. **Scale as Needed**:
   - Railway auto-scales based on usage
   - Monitor and adjust rate limits
   - Optimize database queries if needed

---

## 🆘 Support

For deployment issues:

1. **Railway Issues**: Check Railway status page and docs
2. **Vercel Issues**: Check Vercel status page and docs
3. **API Issues**: Check Google Cloud Console and OpenAI platform
4. **Application Issues**: Check application logs in Railway/Vercel dashboards

Your ValuerPro system is now ready for production! 🚀