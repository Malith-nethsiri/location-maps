# Location Intelligence Web App - Claude Development Guidelines

## Project Overview
A comprehensive location intelligence web application that processes GPS coordinates to provide detailed location analysis including nearby points of interest, distances, navigation, and satellite imagery.

## Technology Stack
- **Frontend**: React.js (deployed on Vercel)
- **Backend**: Node.js/Express (deployed on Railway)
- **Database**: PostgreSQL with PostGIS (hosted on Railway)
- **APIs**: Google Maps Platform (Routes, Places, Static Maps, Geocoding)

## Development Rules & Standards

### 1. API Usage Guidelines
- **CRITICAL**: Use Google Routes API (2025) - NOT the deprecated Directions API
- **Rate Limiting**: Implement exponential backoff for all API calls
- **Error Handling**: Always provide fallback mechanisms for API failures
- **Caching**: Cache API responses to reduce costs and improve performance
- **Security**: Never expose API keys in frontend code - use environment variables

### 2. Code Quality Standards
- **Testing**: Write unit tests for all business logic
- **Error Handling**: Implement comprehensive error handling at all levels
- **Validation**: Validate all input data (coordinates, user inputs)
- **Logging**: Log all API calls, errors, and performance metrics
- **Documentation**: Document all functions and API endpoints

### 3. Database Best Practices
- **Spatial Data**: Use PostGIS for all geographic operations
- **Indexing**: Create proper indexes for coordinate-based queries
- **Migrations**: Use proper database migrations for schema changes
- **Connection Pooling**: Implement connection pooling for performance

### 4. Security Requirements
- **Environment Variables**: Store all sensitive data in environment variables
- **Input Sanitization**: Sanitize all user inputs to prevent injection attacks
- **Rate Limiting**: Implement rate limiting on all API endpoints
- **CORS**: Configure proper CORS policies for production
- **HTTPS**: Ensure all communications are over HTTPS

### 5. Performance Guidelines
- **Lazy Loading**: Implement lazy loading for map components
- **Image Optimization**: Optimize all images and map tiles
- **Caching Strategy**: Implement Redis caching for frequently accessed data
- **Bundle Size**: Keep frontend bundle size minimal
- **Database Queries**: Optimize all database queries with proper indexing

### 6. Error Prevention Strategies
- **Coordinate Validation**: Validate GPS coordinates format and bounds
- **API Fallbacks**: Implement fallback APIs (OpenStreetMap, HERE Maps)
- **Network Timeouts**: Set appropriate timeouts for all API calls
- **Graceful Degradation**: App should work with limited functionality if APIs fail
- **User Feedback**: Provide clear error messages to users

### 7. Deployment Rules
- **Environment Separation**: Maintain separate dev, staging, and production environments
- **CI/CD Pipeline**: Use GitHub Actions for automated deployment
- **Environment Variables**: Never commit sensitive data to repository
- **Database Backups**: Implement regular database backups
- **Monitoring**: Set up application monitoring and alerting

### 8. Progress Tracking Policy
- **MANDATORY**: After completing each task, update progress in plan.md
- **Git Commits**: Make meaningful commits with clear messages
- **Branch Strategy**: Use feature branches for development
- **Pull Requests**: Use PRs for code review before merging to main
- **Documentation Updates**: Update documentation with each feature addition

### 9. API Integration Specifics
- **Google Routes API**: Use POST requests to https://routes.googleapis.com/directions/v2:computeRoutes
- **Places API**: Implement category-based POI searches (schools, hospitals, etc.)
- **Static Maps API**: Generate satellite imagery with coordinate markers
- **Geocoding API**: Convert coordinates to human-readable addresses

### 10. Architecture Patterns
- **Separation of Concerns**: Keep business logic separate from API routes
- **Service Layer**: Implement service layer for all external API calls
- **Data Models**: Use proper data models for all database entities
- **Middleware**: Use middleware for authentication, logging, and error handling
- **Config Management**: Centralize all configuration in dedicated files

### 11. Testing Strategy
- **Unit Tests**: Test all utility functions and business logic
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete user workflows
- **API Testing**: Test all external API integrations with mock data
- **Performance Tests**: Test application performance under load

## Common Pitfalls to Avoid
- ❌ Using deprecated Google Directions API instead of Routes API
- ❌ Exposing API keys in frontend code
- ❌ Not implementing proper error handling for API failures
- ❌ Forgetting to update plan.md after completing tasks
- ❌ Not caching API responses leading to high costs
- ❌ Not validating coordinate inputs properly
- ❌ Not implementing proper CORS policies
- ❌ Not using PostGIS for spatial operations

## Development Workflow
1. Create feature branch from main
2. Implement feature following these guidelines
3. Write tests for new functionality
4. Update documentation
5. Update progress in plan.md
6. Create pull request for review
7. Merge after approval and testing
8. Deploy to staging for testing
9. Deploy to production after validation

## Emergency Procedures
- **API Limits Exceeded**: Switch to fallback APIs immediately
- **Database Issues**: Implement read-only mode with cached data
- **Deployment Failures**: Rollback to previous stable version
- **Security Issues**: Take affected services offline immediately

Remember: Quality over speed. Follow these guidelines strictly to ensure a robust, scalable, and maintainable application.