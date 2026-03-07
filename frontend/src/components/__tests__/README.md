# Frontend Component Tests

This directory contains unit tests for the AI Mood Playlist Generator frontend components.

## Test Coverage

### MoodPlaylistGenerator.test.tsx
Tests the main mood playlist generator component including:
- Input validation (3-200 character requirement)
- Character counter functionality
- Loading state transitions
- Error message display
- Playlist display after generation
- Rate limit handling

**Requirements Validated**: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 13.3

### MoodPlaylistLoading.test.tsx
Tests the loading state component including:
- Animated waveform display
- Loading message ("Analyzing your vibe…")
- Progress indicator
- Accessibility features

**Requirements Validated**: 11.1, 11.2, 11.3

### MoodPlaylistDisplay.test.tsx
Tests the playlist display component including:
- Playlist metadata display (name, emotion, song count)
- Song list rendering (20 songs)
- Action buttons (play, save, share)
- Emotion-based color theming
- Duration formatting

**Requirements Validated**: 5.6, 5.7, 9.1, 10.1

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test MoodPlaylistGenerator.test.tsx
```

## Test Setup

The test environment is configured with:
- **Jest**: Test runner
- **React Testing Library**: Component testing utilities
- **ts-jest**: TypeScript support
- **jsdom**: DOM environment for tests

### Configuration Files
- `jest.config.js`: Jest configuration
- `src/test/setup.ts`: Global test setup (mocks, polyfills)

## Writing New Tests

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names that explain what is being tested
3. Group related tests using `describe` blocks
4. Mock external dependencies (API calls, stores, etc.)
5. Test both success and error scenarios
6. Include accessibility checks where appropriate

### Example Test Structure

```typescript
describe('ComponentName', () => {
  describe('Feature Group (Requirement X.X)', () => {
    it('should do something specific', () => {
      // Arrange
      render(<Component />);
      
      // Act
      fireEvent.click(screen.getByRole('button'));
      
      // Assert
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

## Mocked Dependencies

The following are mocked in tests:
- `@/services/moodPlaylistService`: API service calls
- `@/stores/usePlayerStore`: Player state management
- `react-hot-toast`: Toast notifications
- `window.matchMedia`: Media query matching
- `navigator.clipboard`: Clipboard API

## Common Testing Patterns

### Testing User Input
```typescript
const user = userEvent.setup();
const input = screen.getByRole('textbox');
await user.type(input, 'test input');
```

### Testing Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### Testing Error States
```typescript
mockApiCall.mockRejectedValue(new Error('API Error'));
// ... trigger action
await waitFor(() => {
  expect(screen.getByText(/error/i)).toBeInTheDocument();
});
```

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that path aliases in `jest.config.js` match `tsconfig.json`

### Tests timing out
- Increase timeout in test: `jest.setTimeout(10000)`
- Check for unresolved promises in async tests

### Mock not working
- Ensure mock is defined before component import
- Clear mocks between tests: `jest.clearAllMocks()`

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:
- On pull requests
- Before deployment
- Minimum coverage threshold: 80%

## Related Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
