# ValuerPro - Professional Sri Lankan Property Valuation System

[![Deploy ValuerPro](https://github.com/your-username/valuerpro/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/valuerpro/actions/workflows/deploy.yml)

**🏡 Complete location intelligence and AI-enhanced property valuation platform for Sri Lankan real estate professionals**

## 🌟 Features

### 🗺️ **Location Intelligence**
- **GPS Coordinate Processing** - Drop a pin anywhere in Sri Lanka
- **Automatic Address Resolution** - Complete administrative hierarchy (Village → District → Province)
- **Route Analysis** - Professional route descriptions from major cities
- **POI Discovery** - Schools, hospitals, government offices, banks within configurable radius
- **Satellite Imagery** - High-resolution satellite, hybrid, and terrain maps

### 🤖 **AI Enhancement**
- **Smart Content Generation** - OpenAI-powered professional descriptions
- **Route Descriptions** - AI-enhanced route narratives for valuation reports
- **Locality Analysis** - Comprehensive neighborhood and market analysis
- **Building Descriptions** - Professional property descriptions from basic inputs
- **Cost Optimization** - Intelligent caching and cost tracking

### 📊 **Professional Reporting**
- **Sri Lankan Standards** - RICS-compliant valuation reports
- **13-Section Template** - Complete professional report structure
- **PDF Generation** - High-quality PDFs with watermarking options
- **Image Management** - Categorized property photos with optimization
- **Digital Signatures** - Professional certification and disclaimers

### 📈 **Analytics & Management**
- **Dashboard Overview** - Key metrics and performance indicators
- **Report Analytics** - Location distribution, value trends, completion rates
- **AI Cost Tracking** - Detailed usage and cost analysis
- **User Management** - Professional profiles with IVSL integration

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - For both frontend and backend
- **PostgreSQL with PostGIS** - For spatial data operations
- **Google Maps API Key** - For location services
- **OpenAI API Key** - For AI content generation

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/valuerpro.git
   cd valuerpro
   ```

2. **Set up the database**:
   ```bash
   # Create database and enable PostGIS
   createdb valuerpro
   psql valuerpro -c "CREATE EXTENSION postgis;"

   # Import schema
   psql valuerpro -f database-schema.sql
   ```

3. **Configure environment variables**:
   ```bash
   # Backend
   cp .env.example backend/.env
   # Edit backend/.env with your API keys and database URL

   # Frontend
   cp .env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

4. **Install and start backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

5. **Install and start frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

6. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/api/health

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive design
- **Google Maps Integration** for interactive mapping
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for API communication

### Backend (Node.js + Express)
- **Express.js** with comprehensive middleware
- **PostgreSQL + PostGIS** for spatial data
- **OpenAI Integration** for AI content generation
- **Puppeteer** for PDF generation
- **JWT Authentication** with secure sessions
- **Rate Limiting** and security hardening

### Database Schema
- **Users & Profiles** - Professional valuer information
- **Valuation Reports** - Complete report data model
- **Location Intelligence** - POI analysis and route data
- **AI Content Tracking** - Cost and usage analytics
- **System Monitoring** - Health and performance logs

## 📚 API Documentation

### Core Endpoints

#### Reports
- `POST /api/reports/create-from-coordinates` - Create report from GPS
- `GET /api/reports/:id` - Get report details
- `PUT /api/reports/:id/section/:section` - Update report section
- `GET /api/reports/:id/preview` - Generate PDF preview
- `POST /api/reports/:id/images` - Upload property images

#### AI Enhancement
- `POST /api/reports/enhance-content` - Generate AI content
- `GET /api/reports/analytics/costs/:userId` - AI usage analytics

#### Location Intelligence
- `POST /api/reports/analyze-location` - Analyze coordinates
- `GET /api/reports/:id/poi-analysis` - POI analysis results
- `GET /api/reports/:id/route-data` - Route information

#### Health & Monitoring
- `GET /api/health` - System health check
- `GET /api/health/detailed` - Detailed health metrics
- `GET /api/health/metrics` - Performance metrics (admin)

## 🌍 Deployment

### Production Deployment

**Detailed deployment instructions are available in [DEPLOYMENT.md](./DEPLOYMENT.md)**

#### Quick Deploy to Railway + Vercel

1. **Database (Railway)**:
   ```bash
   # Create PostgreSQL database with PostGIS
   # Import database-schema.sql
   ```

2. **Backend (Railway)**:
   ```bash
   # Connect GitHub repository
   # Set environment variables
   # Auto-deploy on push to main
   ```

3. **Frontend (Vercel)**:
   ```bash
   # Connect GitHub repository
   # Configure build settings
   # Set environment variables
   # Auto-deploy on push to main
   ```

### Environment Variables

#### Backend (Railway)
```bash
DATABASE_URL=postgresql://...
GOOGLE_MAPS_API_KEY=your_key
OPENAI_API_KEY=your_key
JWT_SECRET=your_secret
NODE_ENV=production
ADMIN_API_KEY=your_admin_key
CORS_ORIGIN=https://your-domain.com
```

#### Frontend (Vercel)
```bash
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
REACT_APP_APP_NAME=ValuerPro
```

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Test coverage
npm test -- --coverage
```

### Continuous Integration

GitHub Actions automatically:
- ✅ Tests backend with PostgreSQL + PostGIS
- ✅ Tests frontend build and functionality
- ✅ Runs security audits
- ✅ Validates database schema
- 🚀 Notifies when ready for deployment

## 📊 Monitoring

### Health Checks
- **Basic**: `/api/health` - Service status
- **Detailed**: `/api/health/detailed` - Comprehensive metrics
- **Metrics**: `/api/health/metrics` - Performance analytics

### Analytics Dashboard
- **Report Metrics** - Completion rates, location distribution
- **AI Usage** - Cost tracking, request analytics
- **Performance** - Response times, error rates
- **User Activity** - Report creation trends

## 🔐 Security Features

- **Rate Limiting** - Tiered limits for different endpoints
- **Input Sanitization** - XSS and injection prevention
- **CORS Protection** - Strict origin validation
- **Authentication** - JWT with secure sessions
- **Geographic Validation** - Sri Lankan coordinate bounds
- **File Upload Security** - Type and size validation
- **Error Handling** - Secure error responses

## 🛠️ Development

### Project Structure
```
valuerpro/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   └── utils/           # Utilities
│   └── public/              # Static assets
├── backend/                 # Node.js Express backend
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   └── __tests__/           # Test suites
├── database-schema.sql      # Complete database schema
├── DEPLOYMENT.md           # Deployment instructions
└── README.md               # This file
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS, Google Maps
- **Backend**: Node.js, Express, PostgreSQL, PostGIS, OpenAI
- **Testing**: Jest, Supertest, React Testing Library
- **Deployment**: Railway (backend/DB), Vercel (frontend)
- **CI/CD**: GitHub Actions

## 📞 Support

### Getting Help
- **Documentation**: Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup
- **Health Endpoints**: Monitor system status via API endpoints
- **Logs**: Check Railway/Vercel dashboards for application logs

### Common Issues
- **CORS Errors**: Verify CORS_ORIGIN environment variable
- **Database**: Ensure PostGIS extension is enabled
- **API Keys**: Check Google Cloud Console and OpenAI platform
- **Rate Limits**: Monitor usage in application dashboard

## 🎯 Roadmap

### Current Features ✅
- Complete location intelligence pipeline
- AI-enhanced content generation
- Professional PDF report generation
- Comprehensive analytics dashboard
- Production-ready security and monitoring

### Future Enhancements 🚀
- Mobile application (React Native)
- Advanced GIS analysis tools
- Integration with Sri Lankan government databases
- Multi-language support (Sinhala/Tamil)
- Advanced AI models for property valuation
- Automated comparable sales analysis

## 📄 License

**MIT License** - See [LICENSE](./LICENSE) for details.

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

---

**🏡 ValuerPro - Transforming Property Valuation in Sri Lanka with Location Intelligence and AI**

*Built with ❤️ for Sri Lankan real estate professionals*