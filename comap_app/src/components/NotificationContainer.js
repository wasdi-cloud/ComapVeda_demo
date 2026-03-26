import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import AppNotification from '../dialogues/app-notifications';

const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotifications();

    return (
        <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999, width: '320px', margin: '12px' }}>
            {notifications.map((note) => (
                <AppNotification
                    key={note.id}
                    message={note.message}
                    type={note.type}
                    show={true}
                    onClose={() => removeNotification(note.id)}
                />
            ))}
        </div>
    );
};

export default NotificationContainer;
