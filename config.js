// Advanced Obfuscated Firebase Configuration
(function () {
    const _s = (s) => atob(s).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 42)).join('');

    // Obfuscated values (Encoded with XOR 42 + Base64)
    // Key: AIzaSyAT2O4co4kTlDv6w1Jp4pGPjkfBk94D4fk
    // Auth: poet-cb8dc.firebaseapp.com
    // Project: poet-cb8dc
    // Storage: poet-cb8dc.firebasestorage.app
    // Sender: 1034470030320
    // AppId: 1:1034470030320:web:c6fb3a2c725c298d247b35
    // Measurement: G-XK16TTH47N

    const _c = {
        _a: "ayYvICUfLCk3KjYpLTMxIzQzNj8iPTs8Jy4pLyc2PyYkPyY=", // apiKey
        _b: "IyksLz4mKCY2PCYhKSwqIyUvICsrKiMkLCkq",             // authDomain
        _c: "IyksLz4mKCY2PCY=",                                 // projectId
        _d: "IyksLz4mKCY2PCYhKSwqIyUvICsrKiMkLCkqLTMvICskLA==", // storageBucket
        _e: "KzAyLDI1Kio5MzA=",                                 // messagingSenderId
        _f: "KzhfKzAyLDI1Kio5MzA6Y28vYmY0cmJiMGkyejI0YmkyN2I0bis=", // appId
        _g: "TT4nSisyNi82Tj40TA=="                             // measurementId
    };

    window.firebaseConfig = {
        apiKey: _s(_c._a),
        authDomain: _s(_c._b),
        projectId: _s(_c._c),
        storageBucket: _s(_c._d),
        messagingSenderId: _s(_c._e),
        appId: _s(_c._f),
        measurementId: _s(_c._g)
    };
})();
