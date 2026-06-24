// src/lib/socket.ts
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://skribbl-backend-z442.onrender.com';

export const socket = io(BACKEND_URL, {
    autoConnect: false,
    reconnection: true,          // auto reconnect if connection drops
    reconnectionAttempts: 5,     // try 5 times before giving up
    reconnectionDelay: 1000,     // wait 1 second between attempts
    reconnectionDelayMax: 5000,  // max 5 seconds between attempts
    timeout: 20000,              // 20 second connection timeout
    transports: ['websocket', 'polling'], // try websocket first, fall back to polling
});

// Auto reconnect handling
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect') {
        socket.connect(); // reconnect if server dropped us
    }
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error.message);
});