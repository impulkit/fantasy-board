import React, { useState } from 'react';

const SyncPage = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState('');

    const handleSync = async () => {
        setIsSyncing(true);
        setMessage('Synchronization in progress...');
        try {
            // API call to trigger synchronization
            // await fetch('/api/sync-cricket-data'); // Uncomment and implement API call
            setMessage('Synchronization completed successfully!');
        } catch (error) {
            setMessage('Error during synchronization.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div>
            <h1>Cricket Data Synchronization</h1>
            <button onClick={handleSync} disabled={isSyncing}>{isSyncing ? 'Syncing...' : 'Trigger Sync'}</button>
            <p>{message}</p>
        </div>
    );
};

export default SyncPage;
