# Frontend Testing Setup Guide

This guide explains how to set up and run the unit tests for the AI Mood Playlist Generator frontend components.

## Quick Start

### 1. Install Testing Dependencies

**On Windows:**
```bash
.\install-test-deps.bat
```

**On Linux/Mac:**
```bash
chmod +x install-test-deps.sh
./install-test-deps.sh
```

**Or manually:**
```bash
npm install --save-dev @testing-library/react@^14.0.0 @testing-library/jest-dom@^6.1.5 @testing-library/user-event@^14.5.1 identity-obj-proxy@^3.0.0
```

### 2. Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## What's Been Created

### Test Files

1. **`src/components/__tests__/MoodPlaylistGenerator.test.tsx`**
   - Tests input validation (3-200 character requirement)
   - Tests character counter functionality
   - Tests loading state transitions
   - Tests error message display
   - Tests playlist display after generation
   - Tests rate limit handling
   - **Requirements**: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 13.3

2. **`src/components/__tests__/MoodPlaylistLoading.test.tsx`**
   - Tests animated waveform display
   - Tests loading message ("Analyzing your vibe…")
   - Tests progress indicator
   - Tests accessibility features
   - **Requirements**: 11.1, 11.2, 11.3

3. **`src/components/__tests__/MoodPlaylistDisplay.test.tsx`**
   - Tests playlist metadata display (name, emotion, song count)
   - Tests song list rendering (20 songs)
   - Tests action buttons (play, save, share)
   - Tests emotion-based color theming
   - Tests duration formatting
   - **Requirements**: 5.6, 5.7, 9.1, 10.1

### Configuration Files

1. **`jest.config.js`**
   - Jest configuration for TypeScript and React
   - Path aliases matching Vite config
   - Coverage settings

2. **`src/test/setup.ts`**
   - Global test setup
   - Mocks for window.matchMedia, navigator.clipboard
   - Console mock to reduce test noise

3. **`package.json`** (updated)
   - Added test scripts: `test`, `test:watch`, `test:coverage`

## Test Coverage

The tests cover all acceptance criteria for the frontend components:

### Input Validation (Requirements 1.1, 1.2, 1.3)
- ✅ Empty input validation
- ✅ Minimum length validation (3 characters)
- ✅ Maximum length validation (200 characters)
- ✅ Character counter display
- ✅ Submit button enable/disable
- ✅ Error message display

### Loading State (Requirements 11.1, 11.2, 11.3)
- ✅ Animated waveform display
- ✅ "Analyzing your vibe…" message
- ✅ Progress indicator
- ✅ Loading state transitions

### Playlist Display (Requirements 5.6, 5.7, 9.1, 10.1)
- ✅ Playlist name display
- ✅ Emotion badge display
- ✅ Song count display
- ✅ 20 songs rendered
- ✅ Play, save, share buttons
- ✅ Emotion-based color theming

### Error Handling (Requirement 13.3)
- ✅ User-friendly error messages
- ✅ Rate limit error with upgrade prompt
- ✅ No technical details exposed
- ✅ Inline error display

## Test Structure

Each test file follows this structure:

```typescript
describe('ComponentName', () => {
  describe('Feature Group (Requirement X.X)', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

## Mocked Dependencies

The tests mock the following:
- `@/services/moodPlaylistService` - API calls
- `@/stores/usePlayerStore` - Player state
- `react-hot-toast` - Toast notifications
- `window.matchMedia` - Media queries
- `navigator.clipboard` - Clipboard API

## Running Specific Tests

```bash
# Run tests for a specific component
npm test MoodPlaylistGenerator

# Run tests matching a pattern
npm test -- --testNamePattern="Input Validation"

# Run tests in a specific file
npm test src/components/__tests__/MoodPlaylistLoading.test.tsx
```

## Debugging Tests

### Enable verbose output
```bash
npm test -- --verbose
```

### Run a single test
```typescript
it.only('should do something', () => {
  // This test will run alone
});
```

### Skip a test
```typescript
it.skip('should do something', () => {
  // This test will be skipped
});
```

## Coverage Reports

After running `npm run test:coverage`, you'll see:

1. **Terminal output**: Summary of coverage percentages
2. **HTML report**: Open `coverage/lcov-report/index.html` in a browser for detailed coverage

### Coverage Thresholds

The project aims for:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### "Cannot find module '@/...'"
- Ensure path aliases in `jest.config.js` match your `tsconfig.json`
- Check that all imports use the correct path alias

### "ReferenceError: window is not defined"
- Ensure `testEnvironment: 'jsdom'` is set in `jest.config.js`
- Check that `src/test/setup.ts` is loaded

### Tests timing out
- Increase timeout: `jest.setTimeout(10000)` in test file
- Check for unresolved promises in async tests
- Ensure all async operations use `await` or `waitFor`

### Mock not working
- Ensure mock is defined before component import
- Use `jest.clearAllMocks()` in `beforeEach`
- Check mock implementation matches actual API

## CI/CD Integration

To integrate with CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test -- --ci --coverage --maxWorkers=2

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Next Steps

1. Install dependencies: `npm install` or run the install script
2. Run tests: `npm test`
3. Review coverage: `npm run test:coverage`
4. Fix any failing tests
5. Add more tests as needed for new features

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Component Testing Guide](https://testing-library.com/docs/react-testing-library/example-intro)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test examples in `src/components/__tests__/`
3. Consult the Jest and React Testing Library documentation
