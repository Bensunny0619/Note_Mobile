# Testing Scripts

## Interactive Feature Testing

### Running the Test Script

```bash
# Install ts-node if you haven't already
npm install -g ts-node

# Run the test script
npx ts-node scripts/test-features.ts
```

### What It Does

The test script will:
1. Guide you through testing each feature systematically
2. Provide clear instructions for each test
3. Record pass/fail results
4. Generate a summary report at the end

### Test Categories Covered

- **File Uploads**: Audio, Drawing, Image
- **Offline Mode**: Create/Edit notes offline
- **Sync Queue**: Debouncing, 404 handling
- **Core Features**: Checklists, Pin/Unpin, Colors, Delete
- **Labels**: Create, Attach, Filter
- **Search**: Search by title/content
- **Audio Playback**: Play from list, Global controls
- **Dark Mode**: Theme switching
- **UI/UX**: FAB, Navigation, Error handling

### Tips for Testing

1. **Keep the app running** while testing
2. **Watch the console logs** for sync messages
3. **Test offline mode** by toggling airplane mode
4. **Take notes** of any issues you find
5. **Test on both light and dark modes**

### Expected Log Messages

✅ **Success Messages:**
- `✅ Audio uploaded for note X`
- `✅ Drawing uploaded for note X`
- `✅ Image uploaded for note X`
- `✅ Note created on server with ID: X`
- `✅ Note X updated on server`

⚠️ **Warning Messages:**
- `🗑️ Target resource not found (404), discarding operation`
- `⚠️ Operation X exceeded max retries, dropping from queue`

❌ **Error Messages to Watch For:**
- `❌ Failed to process operation`
- `Network Error`
- `Cannot read property 'length' of undefined`

## Automated Backend API Testing

For backend API testing, you can use the Laravel testing suite:

```bash
cd "Note backend"
php artisan test
```

## Future Improvements

- Add Detox for E2E testing
- Add Jest unit tests for services
- Add component tests with React Native Testing Library
