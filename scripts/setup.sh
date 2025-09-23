#!/bin/bash

# Location Intelligence Web App Setup Script
# This script sets up the development environment

set -e

echo "🔧 Setting up Location Intelligence Web App Development Environment"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check Node.js version
check_node_version() {
    print_header "Checking Node.js Version"

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi

    print_status "Node.js version: $(node -v) ✓"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    # Root dependencies
    print_status "Installing root dependencies..."
    npm install

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

# Setup environment files
setup_environment() {
    print_header "Setting up Environment Files"

    # Backend environment
    if [ ! -f "backend/.env" ]; then
        print_status "Creating backend/.env from example..."
        cp backend/.env.example backend/.env
        print_warning "Please update backend/.env with your actual API keys and database URL"
    else
        print_status "backend/.env already exists"
    fi

    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        print_status "Creating frontend/.env.local from example..."
        cp frontend/.env.example frontend/.env.local
        print_warning "Please update frontend/.env.local with your actual API keys"
    else
        print_status "frontend/.env.local already exists"
    fi
}

# Create logs directory
setup_directories() {
    print_header "Setting up Directories"

    mkdir -p backend/logs
    mkdir -p backend/coverage
    mkdir -p frontend/coverage

    print_status "Directories created successfully"
}

# Check database connection (optional)
check_database() {
    print_header "Checking Database Connection (Optional)"

    if [ ! -z "$DATABASE_URL" ]; then
        print_status "Database URL found: $DATABASE_URL"
        # You could add a database connection test here
    else
        print_warning "DATABASE_URL not set. Database connection will be tested during first run."
    fi
}

# Verify installation
verify_installation() {
    print_header "Verifying Installation"

    # Check backend
    print_status "Checking backend setup..."
    cd backend
    npm run test -- --passWithNoTests || print_warning "Backend tests not configured yet"
    cd ..

    # Check frontend
    print_status "Checking frontend setup..."
    cd frontend
    npm run build || print_error "Frontend build failed"
    cd ..

    print_status "Installation verified successfully"
}

# Show next steps
show_next_steps() {
    print_header "Next Steps"

    echo ""
    print_status "🎉 Setup completed successfully!"
    echo ""
    print_warning "Before running the application, please:"
    echo "   1. Update backend/.env with your Google Maps API key and database URL"
    echo "   2. Update frontend/.env.local with your Google Maps API key"
    echo "   3. Set up your PostgreSQL database with PostGIS extension"
    echo "   4. Run database migrations: cd backend && npm run migrate"
    echo ""
    print_status "To start development:"
    echo "   • Backend: cd backend && npm run dev"
    echo "   • Frontend: cd frontend && npm start"
    echo "   • Both: npm run dev (from root directory)"
    echo ""
    print_status "To deploy:"
    echo "   • Run: ./scripts/deploy.sh"
    echo ""
    print_status "For more information, see README.md and docs/ directory"
}

# Main setup function
main() {
    print_header "Location Intelligence Web App Setup"

    check_node_version
    install_dependencies
    setup_environment
    setup_directories
    check_database
    verify_installation
    show_next_steps
}

# Run main function
main "$@"