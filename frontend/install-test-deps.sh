#!/bin/bash

# Install missing testing dependencies for frontend
echo "Installing testing dependencies..."

npm install --save-dev \
  @testing-library/react@^14.0.0 \
  @testing-library/jest-dom@^6.1.5 \
  @testing-library/user-event@^14.5.1 \
  identity-obj-proxy@^3.0.0

echo "Testing dependencies installed successfully!"
echo ""
echo "You can now run tests with:"
echo "  npm test                 # Run all tests"
echo "  npm run test:watch       # Run tests in watch mode"
echo "  npm run test:coverage    # Run tests with coverage"
