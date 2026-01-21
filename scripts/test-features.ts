/**
 * Feature Testing Script
 * Run this to systematically test all app features
 * 
 * Usage: npx ts-node scripts/test-features.ts
 */

import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim().toLowerCase());
        });
    });
};

const testResults: { category: string; test: string; passed: boolean }[] = [];

const runTest = async (category: string, testName: string, instructions: string) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${category}: ${testName}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n${instructions}\n`);

    const result = await ask('Did this test PASS? (y/n): ');
    const passed = result === 'y' || result === 'yes';

    testResults.push({ category, test: testName, passed });

    if (passed) {
        console.log('✅ PASSED\n');
    } else {
        console.log('❌ FAILED\n');
        const notes = await ask('Optional - Add notes about the failure (or press Enter to skip): ');
        if (notes) {
            console.log(`📝 Notes: ${notes}\n`);
        }
    }
};

const printSummary = () => {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;
    const total = testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)\n`);

    if (failed > 0) {
        console.log('Failed Tests:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`  ❌ ${t.category}: ${t.test}`);
        });
    }
};

const main = async () => {
    console.log('\n🧪 FEATURE TESTING SCRIPT');
    console.log('This script will guide you through testing all app features.\n');

    const proceed = await ask('Ready to begin? (y/n): ');
    if (proceed !== 'y' && proceed !== 'yes') {
        console.log('Test cancelled.');
        rl.close();
        return;
    }

    // ===== FILE UPLOADS =====
    await runTest(
        'File Uploads',
        'Audio Recording Upload',
        `1. Create a new note
2. Tap the microphone icon to record audio
3. Record for a few seconds and stop
4. Save the note
5. Wait for sync to complete
6. Check logs for "✅ Audio uploaded for note X"
7. Verify audio appears in the note`
    );

    await runTest(
        'File Uploads',
        'Drawing Upload',
        `1. Create a new note
2. Tap the drawing icon
3. Draw something on the canvas
4. Save the drawing
5. Save the note
6. Wait for sync to complete
7. Check logs for "✅ Drawing uploaded for note X"
8. Verify drawing appears in the note`
    );

    await runTest(
        'File Uploads',
        'Image Upload',
        `1. Create a new note
2. Tap the image icon
3. Select an image from gallery (or take a photo)
4. Save the note
5. Wait for sync to complete
6. Check logs for "✅ Image uploaded for note X"
7. Verify image appears in the note`
    );

    // ===== OFFLINE MODE =====
    await runTest(
        'Offline Mode',
        'Create Note Offline',
        `1. Turn OFF WiFi/Mobile data
2. Create a new note with title and content
3. Save the note
4. Verify note appears in the list
5. Turn ON WiFi/Mobile data
6. Wait for sync
7. Check logs for "✅ Note created on server with ID: X"
8. Verify note persists after refresh`
    );

    await runTest(
        'Offline Mode',
        'Edit Note Offline',
        `1. Turn OFF WiFi/Mobile data
2. Open an existing note
3. Edit the title and content
4. Save changes
5. Turn ON WiFi/Mobile data
6. Wait for sync
7. Check logs for "✅ Note X updated on server"
8. Verify changes persisted`
    );

    // ===== SYNC QUEUE =====
    await runTest(
        'Sync Queue',
        'Debouncing (Rapid Changes)',
        `1. Open a note
2. Make multiple rapid edits (type quickly, change color, etc.)
3. Observe the sync behavior
4. Verify sync doesn't trigger on every keystroke
5. Check logs - should see sync triggered after 500ms pause`
    );

    await runTest(
        'Sync Queue',
        '404 Error Handling',
        `1. Create a note with a drawing
2. Before the drawing syncs, delete the note
3. Wait for sync to process
4. Check logs for "🗑️ Target resource not found (404), discarding operation"
5. Verify the drawing operation was dropped (not retrying infinitely)`
    );

    // ===== CORE FEATURES =====
    await runTest(
        'Core Features',
        'Create Checklist Note',
        `1. Tap FAB and select "List" option
2. Add several checklist items
3. Save the note
4. Verify checklist appears in note list
5. Open the note and toggle some items
6. Verify checkboxes work correctly`
    );

    await runTest(
        'Core Features',
        'Pin/Unpin Note',
        `1. Long-press a note
2. Select "Pin" from the menu
3. Verify note moves to top with pin icon
4. Long-press again and select "Unpin"
5. Verify pin icon disappears`
    );

    await runTest(
        'Core Features',
        'Change Note Color',
        `1. Open a note
2. Tap the color palette icon
3. Select a different color
4. Save the note
5. Verify note card shows the new color in the list`
    );

    await runTest(
        'Core Features',
        'Delete Note',
        `1. Long-press a note
2. Select "Delete"
3. Confirm deletion
4. Verify note disappears from list
5. Check logs for successful deletion sync`
    );

    // ===== LABELS =====
    await runTest(
        'Labels',
        'Create and Attach Label',
        `1. Open drawer
2. Go to Labels section
3. Create a new label
4. Open a note
5. Attach the label to the note
6. Verify label appears on the note card`
    );

    await runTest(
        'Labels',
        'Filter by Label',
        `1. Tap a label chip in the main screen
2. Verify only notes with that label are shown
3. Tap "All Notes" to clear filter
4. Verify all notes appear again`
    );

    // ===== SEARCH =====
    await runTest(
        'Search',
        'Search Notes',
        `1. Tap the search bar
2. Type part of a note title or content
3. Verify matching notes are shown
4. Clear search
5. Verify all notes appear again`
    );

    // ===== AUDIO PLAYBACK =====
    await runTest(
        'Audio Playback',
        'Play Audio from Note List',
        `1. Find a note with audio recording
2. Tap the audio pill in the note card
3. Verify audio starts playing
4. Verify play/pause button works
5. Tap another note's audio
6. Verify first audio stops and second starts`
    );

    // ===== DARK MODE =====
    await runTest(
        'Dark Mode',
        'Toggle Dark Mode',
        `1. Open drawer
2. Go to Settings
3. Toggle dark mode
4. Verify all screens update correctly
5. Check note cards, drawer, and create note screen
6. Verify no visual glitches`
    );

    // ===== UI/UX =====
    await runTest(
        'UI/UX',
        'FAB Speed Dial',
        `1. Tap the FAB (+ button)
2. Verify speed dial opens with options:
   - Text note
   - Checklist
   - Drawing
   - Image
   - Audio
3. Tap each option and verify correct screen opens`
    );

    await runTest(
        'UI/UX',
        'No UI Crashes',
        `1. Navigate through all screens
2. Open and close multiple notes
3. Scroll through note list
4. Verify no "Cannot read property 'length' of undefined" errors
5. Check console for any React errors`
    );

    // Print summary
    printSummary();

    rl.close();
};

main().catch(console.error);
