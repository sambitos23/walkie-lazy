export const getServiceWorkerScript = (config: Record<string, string | undefined>) => `
// Versioned to ensure browser update
// v1.0.2
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

console.log("[SW] Firebase Messaging SW initializing...");

firebase.initializeApp({
    apiKey: "${config.apiKey}",
    projectId: "${config.projectId}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}"
});

const messaging = firebase.messaging();
console.log("[SW] Firebase Messaging object created.");

// This handles the notification when the app is in the background
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = 'Incoming Transmission!';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/web-app-manifest-192x192.png',
        vibrate: [200, 100, 200], // Buzz-buzz-buzz like a real walkie
        tag: 'call-notification',
        data: { url: '/' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Required for PWA installation criteria
self.addEventListener('fetch', (event) => {
    // Empty listener is enough to satisfy the 'fetch' handler requirement
});
`;
