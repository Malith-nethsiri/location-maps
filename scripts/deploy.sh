#!/bin/bash

# Location Intelligence Web App Deployment Script
# This script automates the deployment process for both frontend and backend

set -e  # Exit on any error

echo "🚀 Starting Location Intelligence Web App Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_header "Checking Dependencies"

    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    # Check for npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    # Check for git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi

    print_status "All dependencies are installed"
}

# Validate environment variables
validate_environment() {
    print_header "Validating Environment Variables"

    if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
        print_warning "GOOGLE_MAPS_API_KEY is not set"
    fi

    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL is not set"
    fi

    print_status "Environment validation complete"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..

    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..

    print_status "All dependencies installed successfully"
}

# Run tests
run_tests() {
    print_header "Running Tests"

    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test || {
        print_error "Backend tests failed"
        exit 1
    }
    cd ..

    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --coverage --watchAll=false || {
        print_error "Frontend tests failed"
        exit 1
    }
    cd ..

    print_status "All tests passed successfully"
}

# Build applications
build_applications() {
    print_header "Building Applications"

    # Build backend
    print_status "Building backend..."
    cd backend
    npm run build || print_warning "No backend build script found"
    cd ..

    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build || {
        print_error "Frontend build failed"
        exit 1
    }
    cd ..

    print_status "Build completed successfully"
}

# Deploy to Railway (Backend)
deploy_backend() {
    print_header "Deploying Backend to Railway"

    if command -v railway &> /dev/null; then
        print_status "Deploying to Railway..."
        railway up
        print_status "Backend deployed to Railway successfully"
    else
        print_warning "Railway CLI not found. Please deploy manually via Railway dashboard"
        print_status "Or install Railway CLI: npm install -g @railway/cli"
    fi
}

# Deploy to Vercel (Frontend)
deploy_frontend() {
    print_header "Deploying Frontend to Vercel"

    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        cd frontend
        vercel --prod
        cd ..
        print_status "Frontend deployed to Vercel successfully"
    else
        print_warning "Vercel CLI not found. Please deploy manually via Vercel dashboard"
        print_status "Or install Vercel CLI: npm install -g vercel"
    fi
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    cd backend
    npm run migrate || {
        print_warning "Migration failed or no migration script found"
    }
    cd ..

    print_status "Database migrations completed"
}

# Health check
health_check() {
    print_header "Running Health Checks"

    if [ ! -z "$BACKEND_URL" ]; then
        print_status "Checking backend health..."
        curl -f "$BACKEND_URL/api/health" || print_warning "Backend health check failed"
    fi

    if [ ! -z "$FRONTEND_URL" ]; then
        print_status "Checking frontend..."
        curl -f "$FRONTEND_URL" || print_warning "Frontend health check failed"
    fi

    print_status "Health checks completed"
}

# Main deployment function
main() {
    print_header "Location Intelligence Web App Deployment"

    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_BUILD=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests    Skip running tests"
                echo "  --skip-build    Skip building applications"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run deployment steps
    check_dependencies
    validate_environment
    install_dependencies

    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_applications
    else
        print_warning "Skipping build as requested"
    fi

    run_migrations
    deploy_backend
    deploy_frontend
    health_check

    print_header "Deployment Complete"
    print_status "🎉 Location Intelligence Web App deployed successfully!"

    if [ ! -z "$FRONTEND_URL" ]; then
        print_status "Frontend URL: $FRONTEND_URL"
    fi

    if [ ! -z "$BACKEND_URL" ]; then
        print_status "Backend URL: $BACKEND_URL"
    fi
}

# Run main function with all arguments
main "$@"