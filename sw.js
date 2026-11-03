// The app requires a connection for Google sign-in and cloud synchronization.
// Do not cache personal data or authentication responses.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});

