import { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useProject } from '../contexts/ProjectContext'; // <-- 1. Import Project Context

const getWsUrl = (projectId) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const wsBase = baseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/ws/${projectId}`;
};

export const useWebSocket = (projectId) => {
    const { addNotification } = useNotifications();
    const { setIsImporting } = useProject(); // <-- 2. Grab the loading setter
    const wsRef = useRef(null);

    useEffect(() => {
        if (!projectId) {
            console.warn('[WS] projectId is null or undefined, skipping connection');
            return;
        }

        const wsUrl = getWsUrl(projectId);
        console.log('[WS] Attempting to connect to:', wsUrl);

        try {
            wsRef.current = new WebSocket(wsUrl);
        } catch (err) {
            console.error('[WS] Connection failed:', err);
            addNotification('WebSocket connection failed.', 'error');
            return;
        }

        const ws = wsRef.current;

        ws.onopen = () => {
            console.log('[WS] ✅ Connected to project:', projectId);
        };

        ws.onmessage = (event) => {
            console.log('[WS] 📨 Message received:', event.data);
            try {
                const payload = JSON.parse(event.data);
                console.log('[WS] Parsed payload:', payload);
                const msg = payload.message || payload.text || 'New event from server';
                const type = payload.messageType || payload.type || 'info';

                console.log('[WS] Displaying notification:', msg, type);
                addNotification(msg, type);

                // --- 3. THE UNLOCK LOGIC ---
                // If the backend sends a success or error message, we assume the import background task is finished!
                // (You can adjust these strings to match EXACTLY what your Python backend sends)
                if (type === 'success' || type === 'error' || type === 'IMPORT_COMPLETE') {
                    setIsImporting(false); // Turns off the spinning earth globally!
                }

            } catch (e) {
                console.warn('[WS] Message parse failed:', event.data, e);
                addNotification('Received invalid interim message from server.', 'warning');
            }
        };

        ws.onclose = (e) => {
            console.log('[WS] ❌ Closed:', e.code, e.reason);
        };

        ws.onerror = (e) => {
            console.error('[WS] ⚠️ Error:', e);
            addNotification('WebSocket error occurred.', 'error');
            setIsImporting(false); // Also unlock the UI if the websocket completely crashes
        };

        // Cleanup on unmount
        return () => {
            console.log('[WS] Component unmounting, closing WebSocket for project:', projectId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [projectId, addNotification, setIsImporting]); // <-- Added setIsImporting to dependencies

    return wsRef.current;
};
