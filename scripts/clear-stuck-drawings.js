// Quick script to clear stuck drawing operations from sync queue
// Run this in the Expo console or add to your app temporarily

import { clearStuckDrawings } from './services/storage';

// Call this function to clear stuck drawings
clearStuckDrawings().then(count => {
    console.log(`Cleared ${count} stuck drawing operations`);
});
