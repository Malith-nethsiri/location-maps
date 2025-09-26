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

---

## 🏗️ **VALUATION REPORTS DEVELOPMENT GUIDELINES**

### 12. Valuation Report System Rules

#### **12.1 Budget-First Development**
- **Cost Optimization**: Every AI API call must be justified and optimized
- **Caching Strategy**: Cache all AI-generated content for reuse (hash-based)
- **Progressive Enhancement**: Build essential features first, add advanced features later
- **Batch Processing**: Combine multiple AI calls into single requests when possible
- **Template Reuse**: Reuse generated content for similar properties/locations

#### **12.2 AI Integration Guidelines**
- **OpenAI API Usage**: Use GPT-4 for quality, GPT-3.5-turbo for cost optimization
- **Token Management**: Optimize prompts to stay under 500 tokens per request
- **Error Handling**: Always provide fallback manual input if AI fails
- **Content Validation**: Validate all AI-generated content before storing
- **Rate Limiting**: Implement proper rate limiting for OpenAI API calls

#### **12.3 Report Structure Compliance**
- **Fixed Template**: Use exact structure from report-structure.md (no variations)
- **Professional Formatting**: A4 size, Times New Roman, specific margins
- **Required Sections**: All 13 sections must be present and properly formatted
- **Placeholder System**: Use {VARIABLE} syntax for all dynamic content
- **PDF Quality**: Maintain print-ready quality with 300 DPI images

#### **12.4 Data Management**
- **Profile-Based Auto-Fill**: Store user professional details for reuse
- **Sri Lankan Context**: Maintain database of administrative divisions
- **Location Integration**: Leverage existing location intelligence data
- **Document Security**: Encrypt sensitive report data at rest
- **Version Control**: Track report revisions and maintain audit trail

#### **12.5 User Experience Standards**
- **Progressive Forms**: Break 200+ fields into digestible steps
- **Smart Defaults**: Auto-populate 80% of fields from context/profile
- **Real-Time Saving**: Save progress continuously, never lose user data
- **Validation Feedback**: Provide immediate feedback on field validation
- **Mobile Responsive**: Ensure forms work on tablets for field inspections

#### **12.6 Performance Requirements**
- **Form Loading**: Initial form should load in under 2 seconds
- **PDF Generation**: Reports should generate in under 10 seconds
- **AI Content**: AI-generated content should appear in under 5 seconds
- **Image Processing**: Optimize all images for web and print
- **Database Queries**: Optimize all spatial and text queries

#### **12.7 Integration Patterns**
- **Location Analysis → Report**: Seamless workflow from existing features
- **POI Data → Market Analysis**: Automatic locality descriptions from POI data
- **GPS → Route Descriptions**: Convert coordinates to professional language
- **Satellite Images → Report**: Include existing satellite imagery in reports
- **Navigation Data → Access Routes**: Use existing navigation for route descriptions

#### **12.8 Quality Assurance**
- **Report Validation**: Check mathematical accuracy and consistency
- **Legal Compliance**: Ensure all legal terminology is correct
- **Professional Language**: Maintain Sri Lankan property valuation standards
- **Image Quality**: Verify all images meet print quality standards
- **PDF Integrity**: Test PDF generation across different devices

#### **12.9 Cost Monitoring**
- **Daily Budgets**: Monitor OpenAI API costs daily
- **Usage Analytics**: Track AI feature usage per user
- **Cost Alerts**: Alert when approaching monthly budget limits
- **ROI Tracking**: Measure time savings vs AI costs
- **Feature Metrics**: Track which AI features provide most value

#### **12.10 Sri Lankan Localization**
- **Administrative Data**: Complete database of Pradeshiya Sabhas, Korales
- **Legal Templates**: Standard deed types, approval authorities
- **Construction Terms**: Local building materials and methods
- **Market Context**: Regional property values and market conditions
- **Currency Formatting**: Proper Sri Lankan Rupee formatting

#### **12.11 Security & Compliance**
- **Data Privacy**: Encrypt all property and client information
- **Access Control**: Role-based access to report features
- **Audit Trails**: Log all report creation and modification activities
- **Backup Strategy**: Regular backups of report data and templates
- **Professional Standards**: Comply with RICS and IVSL requirements

#### **12.12 Error Recovery**
- **AI Failures**: Graceful fallback to manual input
- **PDF Generation Issues**: Retry logic with error reporting
- **Database Outages**: Local storage backup for form data
- **Network Issues**: Offline-capable form completion
- **Validation Errors**: Clear guidance for correction

### 🚫 **Valuation Reports Pitfalls to Avoid**
- ❌ Using AI for every field (cost explosion)
- ❌ Not caching AI-generated content (repeated costs)
- ❌ Deviating from standard report structure
- ❌ Exposing OpenAI API keys in frontend
- ❌ Not validating mathematical calculations
- ❌ Ignoring Sri Lankan legal terminology
- ❌ Not testing PDF generation on different devices
- ❌ Missing form progress saves (data loss)
- ❌ Not integrating with existing location features
- ❌ Forgetting mobile responsiveness for field use

### 💰 **Budget Guidelines**
- **Target Cost**: Under $0.05 per report including all AI features
- **Essential Phase**: $0.02 per report (core AI features only)
- **Enhanced Phase**: $0.04 per report (quality validation + extras)
- **Premium Phase**: $0.06 per report (advanced features)
- **Monthly Monitor**: Track actual vs projected costs weekly
- **ROI Requirement**: AI features must save more time than they cost