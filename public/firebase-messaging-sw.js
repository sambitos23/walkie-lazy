importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// WARNING: Hardcoded values are required here because this is a static file 
// served to the browser and cannot access process.env.
firebase.initializeApp({
    apiKey: "AIzaSyCfAeGG15PTcjTQLGVLnXWEcuaLe0VMt00",
    projectId: "walkie-lazy",
    messagingSenderId: "653074582054",
    appId: "1:653074582054:web:2c8d13cbd725ff702ef4e7"
});

const messaging = firebase.messaging();

// This handles the notification when the app is in the background
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = 'Incoming Transmission!';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png',
        vibrate: [200, 100, 200], // Buzz-buzz-buzz like a real walkie
        tag: 'call-notification',
        data: { url: '/' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});