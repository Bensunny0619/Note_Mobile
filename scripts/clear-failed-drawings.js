/**
 * Clear Failed Drawing Operations
 * Run this to remove stuck drawing operations from the sync queue
 * 
 * Usage: node scripts/clear-failed-drawings.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const clearFailedDrawings = async () => {
    try {
        console.log('🔍 Checking sync queue...');

        const queueData = await AsyncStorage.getItem('sync_queue');
        if (!queueData) {
            console.log('✅ Queue is empty');
            return;
        }

        const queue = JSON.parse(queueData);
        console.log(`📋 Found ${queue.length} operations in queue`);

        // Filter out failed drawing operations
        const filteredQueue = queue.filter(op => {
            if (op.type === 'CREATE_DRAWING' && op.retryCount >= 3) {
                console.log(`🗑️ Removing failed drawing operation: ${op.id}`);
                return false;
            }
            return true;
        });

        const removed = queue.length - filteredQueue.length;

        if (removed > 0) {
            await AsyncStorage.setItem('sync_queue', JSON.stringify(filteredQueue));
            console.log(`✅ Removed ${removed} failed drawing operations`);
            console.log(`📊 Queue now has ${filteredQueue.length} operations`);
        } else {
            console.log('✅ No failed drawing operations to remove');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

clearFailedDrawings();
