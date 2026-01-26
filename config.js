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
        _a: "a2NQS3lTa34YZR5JRR5BfkZuXBxdG2BaHlptekBBTGhBEx5uHkxB", // apiKey
        _b: "WkVPXgdJSBJOSQRMQ1hPSEtZT0taWgRJRUc=",                 // authDomain
        _c: "WkVPXgdJSBJOSQ==",                                     // projectId
        _d: "WkVPXgdJSBJOSQRMQ1hPSEtZT1leRVhLTU8ES1pa",             // storageBucket
        _e: "GxoZHh4dGhoZGhkYGg==",                                 // messagingSenderId
        _f: "GxAbGhkeHh0aGhkaGRgaEF1PSBBJHExIGUsYSR0YH0kYExJOGB4dSBkf", // appId
        _g: "bQdyYRscfn5iHh1k"                                     // measurementId
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
