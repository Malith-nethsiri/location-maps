# Deployment Guide

This guide covers how to deploy the Location Intelligence Web App to Vercel (frontend) and Railway (backend + database).

## Prerequisites

- GitHub account with this repository
- Vercel account
- Railway account
- Google Maps API key

## Environment Variables Required

### Backend (Railway)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REDIS_URL=redis://host:port (optional)
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-railway-backend.railway.app/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Railway Deployment (Backend + Database)

1. **Connect Repository to Railway**
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub repo
   - Select this repository

2. **Configure Services**

   **Database Service:**
   - Add PostgreSQL service
   - Note the connection details
   - Enable PostGIS extension after deployment

   **Backend Service:**
   - Deploy from `backend` directory
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`
   - Configure environment variables (see above)

3. **Set Environment Variables**
   ```bash
   # In Railway dashboard, add these variables:
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   GOOGLE_MAPS_API_KEY=your_actual_api_key
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Run Database Migrations**
   ```bash
   # After deployment, run migrations via Railway CLI or connect to database
   npm run migrate
   ```

5. **Verify Deployment**
   - Check health endpoint: `https://your-backend.railway.app/api/health`
   - Verify database connection

## Vercel Deployment (Frontend)

1. **Connect Repository to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import project from GitHub
   - Select this repository

2. **Configure Build Settings**
   - Framework Preset: Create React App
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`
   - Install Command: `cd frontend && npm install`

3. **Set Environment Variables**
   ```bash
   # In Vercel dashboard, add these variables:
   REACT_APP_API_URL=https://your-railway-backend.railway.app/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key
   ```

4. **Configure vercel.json**
   - Update `vercel.json` with your Railway backend URL
   - Set up API proxy routes

5. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Verify deployment at your Vercel URL

## Google Maps API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing

2. **Enable Required APIs**
   - Maps JavaScript API
   - Places API
   - Routes API
   - Geocoding API
   - Distance Matrix API
   - Maps Static API

3. **Create API Key**
   - Go to Credentials section
   - Create API key
   - Restrict key to your domains

4. **Configure API Key Restrictions**
   ```
   Application restrictions:
   - HTTP referrers (web sites)
   - Add your Vercel domain: https://your-app.vercel.app/*
   - Add localhost for development: http://localhost:3000/*

   API restrictions:
   - Restrict key to selected APIs
   - Select all the APIs listed above
   ```

## Custom Domain Setup (Optional)

### For Vercel (Frontend)
1. Add custom domain in Vercel dashboard
2. Configure DNS records with your domain provider
3. Update CORS_ORIGIN in Railway backend

### For Railway (Backend)
1. Add custom domain in Railway dashboard
2. Update REACT_APP_API_URL in Vercel

## SSL Certificates

Both Vercel and Railway provide automatic SSL certificates for HTTPS.

## Monitoring and Logging

### Railway
- Built-in logging in Railway dashboard
- Monitor resource usage
- Set up alerts for downtime

### Vercel
- Analytics in Vercel dashboard
- Function logs
- Performance insights

## Health Checks

- Backend health: `https://your-backend.railway.app/api/health`
- Frontend health: Vercel provides automatic monitoring

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS_ORIGIN in Railway matches Vercel URL
   - Check that both HTTP and HTTPS are configured

2. **Database Connection Issues**
   - Verify DATABASE_URL is correctly set
   - Check PostGIS extension is enabled
   - Run migrations if tables are missing

3. **Google Maps API Issues**
   - Verify API key is correctly set in both environments
   - Check API restrictions allow your domains
   - Ensure all required APIs are enabled

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

### Debug Commands

```bash
# Test backend health
curl https://your-backend.railway.app/api/health

# Test specific API endpoints
curl -X POST https://your-backend.railway.app/api/location/geocode \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}'

# Check frontend build locally
cd frontend && npm run build

# Test backend locally
cd backend && npm run dev
```

## Scaling

### Railway
- Automatic scaling based on usage
- Configure resource limits in dashboard
- Monitor database performance

### Vercel
- Automatic scaling for static assets
- Serverless functions scale automatically
- Consider Vercel Pro for higher limits

## Backup Strategy

### Database
- Railway provides automatic backups
- Set up additional backup strategy if needed
- Export data regularly for critical applications

### Code
- GitHub repository serves as code backup
- Tag releases for rollback capability

## Security Checklist

- [ ] API keys are properly restricted
- [ ] HTTPS is enforced everywhere
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] No secrets in code/logs
- [ ] Database access is restricted
- [ ] Error messages don't expose sensitive info

## Performance Optimization

### Backend
- Enable gzip compression
- Implement response caching
- Optimize database queries
- Use connection pooling

### Frontend
- Optimize bundle size
- Enable lazy loading
- Use CDN for static assets
- Implement service worker caching

## Cost Optimization

### Railway
- Monitor resource usage
- Optimize database queries
- Use appropriate plan tier

### Vercel
- Optimize build times
- Monitor function execution time
- Use appropriate plan tier

### Google Maps API
- Implement client-side caching
- Use appropriate zoom levels
- Optimize API calls
- Consider usage limits