# Location Intelligence Web App

A comprehensive location intelligence web application that processes GPS coordinates and provides detailed location analysis including nearby points of interest, distances, navigation, and satellite imagery.

## 🏗️ Architecture

- **Frontend**: React.js deployed on Vercel
- **Backend**: Node.js/Express deployed on Railway
- **Database**: PostgreSQL with PostGIS on Railway
- **APIs**: Google Maps Platform (Routes, Places, Static Maps, Geocoding)

## 📁 Project Structure

```
├── frontend/          # React frontend (Vercel)
├── backend/           # Node.js API (Railway)
├── database/          # Database schemas and migrations
│   ├── migrations/    # Database migration files
│   └── schemas/       # Database schema definitions
├── docs/              # Documentation
│   └── api/           # API documentation
├── .github/           # GitHub workflows and templates
│   └── workflows/     # CI/CD pipelines
├── claude.md          # Development guidelines and rules
└── plan.md            # Implementation roadmap and progress
```

## 🚀 Features

- **Coordinate Processing**: Validate and process GPS coordinates
- **POI Discovery**: Find nearby schools, hospitals, government buildings, religious places, stores
- **Distance Calculations**: Calculate distances to all POIs and nearest city
- **Navigation**: Turn-by-turn directions with road names and landmarks
- **Satellite View**: High-resolution satellite imagery with precise coordinate marking
- **Performance**: Caching, rate limiting, and error recovery

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL with PostGIS
- Google Maps API keys

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Backend (.env)**:
```
DATABASE_URL=postgresql://...
GOOGLE_MAPS_API_KEY=your_api_key
REDIS_URL=redis://...
NODE_ENV=development
```

**Frontend (.env.local)**:
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
```

### Installation

1. **Backend Setup**:
```bash
cd backend
npm install
npm run migrate
npm run dev
```

2. **Frontend Setup**:
```bash
cd frontend
npm install
npm start
```

## 📚 Documentation

- [Development Guidelines](./claude.md) - Rules and best practices
- [Implementation Plan](./plan.md) - Detailed roadmap and progress
- [API Documentation](./docs/api/) - API endpoints and usage

## 🚀 Deployment

### Vercel (Frontend)
- Connect GitHub repository to Vercel
- Configure environment variables
- Automatic deployments on push to main

### Railway (Backend + Database)
- Deploy Node.js service to Railway
- Provision PostgreSQL database with PostGIS
- Configure environment variables

## 📊 Progress

Current Status: **IN DEVELOPMENT** (Phase 1 - Foundation)

See [plan.md](./plan.md) for detailed progress tracking.

## 🤝 Contributing

1. Follow guidelines in [claude.md](./claude.md)
2. Update progress in [plan.md](./plan.md) after completing tasks
3. Create feature branches for development
4. Submit pull requests for review

## 📄 License

This project is licensed under the MIT License.