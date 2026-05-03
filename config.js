// Advanced Obfuscated Firebase Configuration
(function () {
    const _s = (s) => atob(s).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 42)).join('');

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
