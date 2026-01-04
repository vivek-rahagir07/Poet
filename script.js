// --- Firebase Setup (Compat) ---
const firebaseConfig = {
    apiKey: "AIzaSyAT2O4co4kTlDv6w1Jp4pGPjkfBk94D4fk",
    authDomain: "poet-cb8dc.firebaseapp.com",
    projectId: "poet-cb8dc",
    storageBucket: "poet-cb8dc.firebasestorage.app",
    messagingSenderId: "1034470030320",
    appId: "1:1034470030320:web:c6fb3a2c725c298d247b35",
    measurementId: "G-XK16TTH47N"
};

// Initialize Firebase using global namespace
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Image Configuration
const totalImages = 24;
const imageFolder = 'my galary';
const galleryGrid = document.getElementById('gallery-grid');
let localArticles = [];

// --- Like System Data ---
let likedItems = JSON.parse(localStorage.getItem('poet_liked_items')) || {};
let galleryLikes = {};
let lastTotalLikes = 0;

// --- Data Management (Firestore) ---
function initLikeSystem() {
    db.collection("gallery_likes").onSnapshot((snapshot) => {
        let total = 0;
        snapshot.docs.forEach(doc => {
            const count = doc.data().count || 0;
            galleryLikes[doc.id] = count;
            total += count;
        });

        // Trigger heart popup if someone else likes something
        if (total > lastTotalLikes && lastTotalLikes !== 0) {
            triggerHeartPopup();
        }
        lastTotalLikes = total;

        updateLikeUI(total);
    });
}

function initVisitCounter() {
    const visitRef = db.collection("site_stats").doc("global_visits");
    const visitKey = 'poet_visit_recorded_v1';
    let lastVisitCount = 0;

    // Increment if new visitor
    if (!localStorage.getItem(visitKey)) {
        localStorage.setItem(visitKey, 'true');

        // Use a transaction/increment to ensure accuracy
        visitRef.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true })
            .catch(err => console.error("Error incrementing visits:", err));
    }

    // Real-time listener
    visitRef.onSnapshot((doc) => {
        if (doc.exists) {
            const INITIAL_OFFSET = 56;
            const count = (doc.data().count || 0) + INITIAL_OFFSET;
            const counterEl = document.querySelector('.total-visits-count');

            // Live Detection: If count increases (and it's not the first load), show feedback
            if (lastVisitCount !== 0 && count > lastVisitCount) {
                showGlobalFeedback("A new shadow has entered... 👁");
                // Optional: slight eye pulse
                const eyeIcon = document.querySelector('.eye-icon');
                if (eyeIcon) {
                    eyeIcon.style.animation = 'none';
                    eyeIcon.offsetHeight; /* trigger reflow */
                    eyeIcon.style.animation = 'pulseSmall 0.5s ease';
                }
            }

            if (counterEl) {
                animateValue(counterEl, parseInt(counterEl.textContent) || 0, count, 2000);
            }

            lastVisitCount = count;
        }
    });
}

function updateLikeUI(totalLikes = null) {
    document.querySelectorAll('.like-interaction').forEach(el => {
        const id = el.dataset.id;
        const countEl = el.querySelector('.like-count');
        const heartEl = el.querySelector('.like-heart');

        if (countEl) countEl.textContent = galleryLikes[id] || 0;
        if (heartEl) {
            if (likedItems[id]) {
                heartEl.classList.add('liked');
            } else {
                heartEl.classList.remove('liked');
            }
        }
    });

    // Update Global Counter
    const globalCountEl = document.querySelector('.total-likes-count');
    if (globalCountEl && totalLikes !== null) {
        animateValue(globalCountEl, parseInt(globalCountEl.textContent) || 0, totalLikes, 1000);
    }
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

async function toggleLike(id) {
    const isLiked = likedItems[id];

    // Optimistic UI update
    if (isLiked) {
        delete likedItems[id];
        galleryLikes[id] = (galleryLikes[id] || 1) - 1;
    } else {
        likedItems[id] = true;
        galleryLikes[id] = (galleryLikes[id] || 0) + 1;
        triggerHeartPopup(); // Trigger cinematic popup
    }

    localStorage.setItem('poet_liked_items', JSON.stringify(likedItems));
    updateLikeUI();

    // Firestore Update
    const likeRef = db.collection("gallery_likes").doc(id);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(likeRef);
            if (!doc.exists) {
                transaction.set(likeRef, { count: isLiked ? 0 : 1 });
            } else {
                const newCount = isLiked ? Math.max(0, doc.data().count - 1) : doc.data().count + 1;
                transaction.update(likeRef, { count: newCount });
            }
        });
    } catch (e) {
        console.error("Like transaction failed: ", e);
    }
}

function triggerHeartPopup() {
    // Heart Fountain: Spawn 5 hearts
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('floating-heart');
            heart.innerHTML = '❤';

            // Randomize position and scale for a natural fountain look
            const startX = (window.innerWidth / 2) + (Math.random() * 200 - 100);
            const startY = window.innerHeight * 0.8;

            const randomSize = 0.5 + Math.random() * 1.5;
            const randomRotation = Math.random() * 40 - 20;

            heart.style.left = `${startX}px`;
            heart.style.top = `${startY}px`;
            heart.style.transform = `scale(${randomSize}) rotate(${randomRotation}deg)`;

            document.body.appendChild(heart);

            // Cleanup
            setTimeout(() => {
                heart.remove();
            }, 1500);
        }, i * 100); // Slight stagger for cinematic feel
    }
}

// --- Sharing System ---
async function sharePiece(data) {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#${data.id}`;

    const shareTitle = data.type === 'image' ? "Echoes of Silence - Poetry Piece" : data.title;
    const shareText = data.type === 'image'
        ? `Check out this beautiful poetry piece from Rahagir: ${shareUrl}`
        : `"${data.title}"\n\n${data.body.substring(0, 150)}...\n\nRead more at: ${shareUrl}`;

    if (navigator.share) {
        const shareData = {
            title: shareTitle,
            text: shareText,
            url: shareUrl,
        };

        // Attempt to share image file if supported
        if (data.type === 'image') {
            try {
                const response = await fetch(data.src);
                const blob = await response.blob();
                const file = new File([blob], 'poetry-piece.jpg', { type: blob.type });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    shareData.files = [file];
                }
            } catch (e) {
                console.log("File share not supported or failed:", e);
            }
        }

        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.log('Error sharing:', err);
            }
        }
    } else {
        // Fallback: Copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            showGlobalFeedback("Link copied to clipboard! ✨");
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
}

function showGlobalFeedback(msg) {
    const feedback = document.getElementById('sub-feedback'); // Reuse subscription feedback for general one
    if (!feedback) return;

    feedback.innerText = msg;
    feedback.classList.add('visible');

    // Smoothly scroll to feedback if it's far
    const rect = feedback.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
        feedback.classList.remove('visible');
    }, 4000);
}
function initRealtimeUpdates() {
    db.collection("articles").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        localArticles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderGallery();

        // Handle deep link once articles are loaded
        if (!window._initialDeepLinkHandled) {
            handleDeepLinking();
            window._initialDeepLinkHandled = true;
        }
    });
}

function handleDeepLinking() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    // Check if it's an image from static gallery
    if (hash.startsWith('img-')) {
        const idParts = hash.split('-');
        const index = idParts[1];
        const src = `${imageFolder}/${index}.jpg`;
        openLightbox(src, hash);
    } else {
        // Check if it's a dynamic article
        const article = localArticles.find(a => a.id === hash);
        if (article) {
            if (article.type === 'image') {
                openLightbox(article.src, article.id);
            } else {
                openTextModal(article);
            }
        }
    }
}

window.addEventListener('hashchange', handleDeepLinking);

async function saveArticleToFirebase(title, body) {
    try {
        await db.collection("articles").add({
            title,
            body,
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text'
        });
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
}

// --- Comment System Logic ---
async function saveComment(pieceId, text) {
    if (!text.trim()) return;
    try {
        await db.collection("comments").add({
            pieceId,
            text: text.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            date: new Date().toLocaleString()
        });
    } catch (e) {
        console.error("Error saving comment:", e);
    }
}

function loadComments(pieceId, container) {
    return db.collection("comments")
        .where("pieceId", "==", pieceId)
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<div class="comment-item" style="border:none; background:none; color:#666;">No whispers yet... be the first.</div>';
                return;
            }
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.classList.add('comment-item');
                div.innerHTML = `
                    <div class="comment-text">${data.text}</div>
                    <span class="comment-date">${data.date || 'Somewhere in time'}</span>
                `;
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            });
        });
}

function initGlobalWhispers() {
    const feed = document.getElementById('global-whispers-feed');
    if (!feed) return;

    db.collection("comments")
        .orderBy("timestamp", "desc")
        .limit(10) // Small batch for marquee loop
        .onSnapshot((snapshot) => {
            feed.innerHTML = '';
            if (snapshot.empty) {
                feed.innerHTML = '<p style="padding: 2rem; opacity:0.5; font-style: italic;">The void is silent... waiting for your echoes.</p>';
                return;
            }

            const whispers = snapshot.docs.map(doc => doc.data());

            // Function to create a card
            const createCard = (data) => {
                const card = document.createElement('div');
                card.classList.add('whisper-card');
                card.style.cursor = 'pointer'; // Make it look clickable

                // Add randomized variety for organic feel
                const tilts = ['tilt-left', 'tilt-right', 'tilt-none'];
                const sizes = ['size-sm', 'size-md', 'size-lg'];
                card.classList.add(tilts[Math.floor(Math.random() * tilts.length)]);
                card.classList.add(sizes[Math.floor(Math.random() * sizes.length)]);

                card.innerHTML = `
                    <div class="whisper-info">
                        <div class="whisper-meta">A Wayfarer whispered...</div>
                        <div class="whisper-content">"${data.text}"</div>
                    </div>
                    <div class="whisper-date">${data.date || ''}</div>
                `;

                // Add click event to navigate to the post
                card.addEventListener('click', () => {
                    if (data.pieceId) {
                        window.location.hash = data.pieceId;
                    }
                });

                return card;
            };

            // Inject whispers twice for seamless horizontal scrolling
            [...whispers, ...whispers].forEach(data => {
                feed.appendChild(createCard(data));
            });
        });
}

// --- Preloader ---
window.addEventListener('load', () => {
    const preloader = document.querySelector('.preloader');
    const progressBar = document.querySelector('.progress-bar');
    const percentage = document.querySelector('.loading-percentage');

    if (preloader && progressBar && percentage) {

        // Typewriter Logic for Preloader
        const quoteText = document.querySelector('.preloader-quote');
        let totalDuration = 2000; // Default fallback

        if (quoteText) {
            const originalText = quoteText.textContent.trim();
            quoteText.textContent = '';

            const typingSpeed = 50; // Balanced speed
            const totalChars = originalText.length;

            let i = 0;
            const typeQuote = () => {
                if (i <= totalChars) {
                    // Update Text
                    if (i < totalChars) {
                        quoteText.textContent += originalText.charAt(i);
                    }

                    // Update Progress directly tied to typing
                    const progress = Math.min(100, Math.floor((i / totalChars) * 100));
                    progressBar.style.width = progress + '%';
                    percentage.textContent = progress + '%';

                    if (i === totalChars) {
                        // Finished
                        quoteText.classList.add('shine');
                        setTimeout(() => {
                            preloader.classList.add('hidden');
                            initTypewriter();
                            initScrollReveal();
                        }, 1200);
                    } else {
                        i++;
                        setTimeout(typeQuote, typingSpeed);
                    }
                }
            };
            setTimeout(typeQuote, 100);
        } else {
            // Fallback if no quote text (just in case)
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 100) {
                    clearInterval(interval);
                    preloader.classList.add('hidden');
                    initTypewriter();
                    initScrollReveal();
                } else {
                    width += 2;
                    progressBar.style.width = width + '%';
                    percentage.textContent = Math.floor(width) + '%';
                }
            }, 30);
        }
    } else {
        // Fallback if elements not found
        if (preloader) preloader.classList.add('hidden');
        initTypewriter();
        initScrollReveal();
    }
});

// --- Typewriter Effect ---
function initTypewriter() {
    const phrases = [
        "words that linger...",
        "thoughts unspoken...",
        "verses of the heart...",
        "echoes in silence...",
        "ink on paper...",
        "stories untold..."
    ];

    const typewriterText = document.querySelector('.typewriter-text');
    if (!typewriterText) return;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typewriterText.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typewriterText.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }

        let typeSpeed = isDeleting ? 50 : 100;

        if (!isDeleting && charIndex === currentPhrase.length) {
            typeSpeed = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 500; // Pause before next phrase
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

// --- Particle System ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.5;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    const numberOfParticles = (canvas.width * canvas.height) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    connectParticles();
    requestAnimationFrame(animateParticles);
}

function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            let distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));
            if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                opacityValue = 1 - (distance / 20000);
                if (opacityValue > 0) {
                    ctx.strokeStyle = 'rgba(255, 255, 255,' + (opacityValue * 0.05) + ')';
                    ctx.beginPath();
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }
}

initParticles();
animateParticles();


// --- Hero Collage ---
function initHeroCollage() {
    const rows = document.querySelectorAll('.collage-row');
    if (!rows.length) return;

    const indices = Array.from({ length: totalImages }, (_, i) => i + 1);
    indices.sort(() => Math.random() - 0.5);

    rows.forEach((row, rowIndex) => {
        let rowIndices = [...indices].sort(() => Math.random() - 0.5);
        const displayList = [...rowIndices.slice(0, 12), ...rowIndices.slice(0, 12)];

        displayList.forEach(i => {
            const img = document.createElement('img');
            img.src = `${imageFolder}/${i}.jpg`;
            img.classList.add('collage-img');
            img.alt = "";
            img.style.opacity = (0.6 + Math.random() * 0.4).toFixed(2);
            row.appendChild(img);
        });
    });
}


// --- Gallery Logic & 3D Tilt ---
function renderGallery() {
    galleryGrid.innerHTML = '';

    const articles = localArticles;
    let items = [];
    const now = Date.now();
    const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

    // Create a Set of existing dynamic image sources for deduplication
    const dynamicImageSources = new Set(
        articles.filter(a => a.type === 'image').map(a => a.src)
    );

    // Add images
    for (let i = 1; i <= totalImages; i++) {
        const imgSrc = `${imageFolder}/${i}.jpg`;
        const encodedSrc = encodeURI(imgSrc);

        // Skip if this image is already promoted (exists in dynamic articles)
        if (dynamicImageSources.has(encodedSrc) || dynamicImageSources.has(imgSrc)) {
            continue;
        }

        items.push({
            type: 'image',
            src: encodedSrc,
            id: `img-${i}`,
            category: 'poetry',
            isRecent: false // Static images are considered legacy
        });
    }

    // Add text articles
    // Sort dynamic articles by timestamp (descending) before processing
    const sortedArticles = [...articles].sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
    });

    sortedArticles.forEach((art, index) => {
        const timestamp = art.timestamp ? art.timestamp.toDate().getTime() : now;
        const isWithinTime = (now - timestamp) < FOUR_DAYS_MS;

        // REFINED RULE: Only the TOP 4 latest pieces are "Recent"
        // Everything else (or older than 4 days) is "Expired" (faded)
        const isRecent = index < 4 && isWithinTime;
        const isExpired = !isRecent; // Force fading for anything not in the top 4 recent

        items.push({
            type: 'text', // Default
            category: 'articles', // Default
            ...art,
            isRecent: isRecent,
            isExpired: isExpired
        });
    });

    items.sort(() => Math.random() - 0.5);

    items.forEach(data => {
        const item = document.createElement('div');
        item.classList.add('gallery-item');
        item.dataset.category = data.category;

        if (data.isRecent) item.classList.add('recent-item');
        if (data.isExpired) item.classList.add('expired');

        if (data.type === 'image') {
            const img = document.createElement('img');
            img.src = data.src;
            img.alt = 'Portfolio Piece';
            img.loading = 'lazy';
            img.onerror = function () {
                this.src = 'https://via.placeholder.com/600x800/111/D4AF37?text=Poetry+Piece'; // Fallback
                this.classList.add('is-placeholder');
            };

            const overlay = document.createElement('div');
            overlay.classList.add('item-overlay');
            overlay.innerHTML = `
                <span class="view-label">View Piece</span>
                <button class="admin-promote-btn" title="Push to Recent">⚡ Promote</button>
                <div class="item-actions">
                    <div class="like-interaction" data-id="${data.id}">
                        <span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span>
                        <span class="like-count">${galleryLikes[data.id] || 0}</span>
                    </div>
                    <div class="share-btn" title="Share Piece">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45-1-1-1z"/>
                        </svg>
                    </div>
                </div>
            `;

            item.appendChild(img);
            item.appendChild(overlay);

            // Separate clicks for like vs share vs view
            overlay.querySelector('.admin-promote-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                promoteToRecent(data);
            });
            overlay.querySelector('.like-interaction').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(data.id);
            });

            overlay.querySelector('.share-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                sharePiece(data);
            });

            item.addEventListener('click', () => openLightbox(data.src, data.id));
            addTiltEffect(item, img);

        } else if (data.type === 'text') {
            item.classList.add('article-card');
            item.innerHTML = `
                <div class="article-title">${data.title}</div>
                <div class="article-excerpt">${data.body}</div>
                <div class="article-footer">
                    <span class="read-more">Read Piece</span>
                    <div class="article-actions-row">
                        <div class="like-interaction" data-id="${data.id}">
                            <span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span>
                            <span class="like-count">${galleryLikes[data.id] || 0}</span>
                        </div>
                        <div class="share-btn" title="Share Piece">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45-1-1-1z"/>
                            </svg>
                        </div>
                    </div>
                </div>
            `;

            item.querySelector('.like-interaction').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(data.id);
            });

            item.querySelector('.share-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                sharePiece(data);
            });

            item.addEventListener('click', () => openTextModal(data));
            addTiltEffect(item, item);
        }

        galleryGrid.appendChild(item);
    });

    // Initial reveals for items already in viewport
    setTimeout(() => {
        initScrollReveal();
        // Force reveal top items in case observer is slow
        const firstItems = document.querySelectorAll('.gallery-item');
        firstItems.forEach((item, index) => {
            if (index < 6) item.classList.add('visible');
        });
    }, 100);
}

function addTiltEffect(container, target) {
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        target.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });
    container.addEventListener('mouseleave', () => {
        target.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
    });
}

// --- Scroll Reveal ---
function initScrollReveal() {
    const reveals = document.querySelectorAll('.gallery-item, h2, p, .about-grid, .about-image-wrapper, .about-text-content, .reveal-text, .looping-message-frame');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(element => {
        if (!element.classList.contains('gallery-item') && !element.classList.contains('reveal-text')) {
            element.classList.add('reveal-text');
        }
        observer.observe(element);
    });
}

// --- Lightbox & Text Modal ---
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close-lightbox');

function openLightbox(src, id) {
    lightboxImg.style.display = 'block';
    const existingText = lightbox.querySelector('.article-read-content');
    if (existingText) existingText.remove();
    const existingActions = lightbox.querySelector('.modal-actions-container');
    if (existingActions) existingActions.remove();

    lightboxImg.src = src;

    // Add modal actions container (Like + Go Back)
    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('modal-actions-container');

    actionsContainer.innerHTML = `
        <button class="modal-like-btn like-interaction" data-id="${id}">
            <span class="like-heart ${likedItems[id] ? 'liked' : ''}">❤</span>
            <span>Like Piece</span>
            <span class="like-count">(${galleryLikes[id] || 0})</span>
        </button>
        <button class="modal-like-btn go-back-btn" id="lightbox-go-back">
            <span>Go Back</span>
        </button>
    `;

    actionsContainer.querySelector('.like-interaction').addEventListener('click', () => toggleLike(id));
    actionsContainer.querySelector('#lightbox-go-back').addEventListener('click', closeLightbox);

    lightbox.appendChild(actionsContainer);

    // Add Comment Section
    const commentSection = document.createElement('div');
    commentSection.classList.add('comment-section');
    commentSection.innerHTML = `
        <h3>Whispers</h3>
        <div class="comment-list" id="gallery-comments"></div>
        <div class="comment-input-container">
            <input type="text" class="comment-input" placeholder="Leave a whisper..." id="gal-comment-input">
            <button class="send-comment-btn" id="gal-send-comment">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            </button>
        </div>
    `;

    const commentList = commentSection.querySelector('#gallery-comments');
    const unsubscribe = loadComments(id, commentList);

    // Store unsubscribe to call on close
    lightbox.dataset.commentUnsubscribe = 'active';
    window._currentUnsubscribe = unsubscribe;

    commentSection.querySelector('#gal-send-comment').addEventListener('click', async () => {
        const input = commentSection.querySelector('#gal-comment-input');
        await saveComment(id, input.value);
        input.value = '';
    });

    commentSection.querySelector('#gal-comment-input').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const input = commentSection.querySelector('#gal-comment-input');
            await saveComment(id, input.value);
            input.value = '';
        }
    });

    lightbox.appendChild(commentSection);

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function openTextModal(article) {
    lightboxImg.style.display = 'none';
    const existingText = lightbox.querySelector('.article-read-content');
    if (existingText) existingText.remove();
    const existingActions = lightbox.querySelector('.modal-actions-container');
    if (existingActions) existingActions.remove();

    const content = document.createElement('div');
    content.classList.add('article-read-content');
    content.classList.add('article-read-modal');
    content.innerHTML = `
        <h2>${article.title}</h2>
        <p>${article.body}</p>
        <div class="modal-actions-container">
            <button class="modal-like-btn like-interaction" data-id="${article.id}">
                <span class="like-heart ${likedItems[article.id] ? 'liked' : ''}">❤</span>
                <span>Like Piece</span>
                <span class="like-count">(${galleryLikes[article.id] || 0})</span>
            </button>
             <button class="modal-like-btn go-back-btn" id="modal-go-back">
                <span>Go Back</span>
            </button>
        </div>
        <div class="comment-section">
            <h3>Whispers</h3>
            <div class="comment-list" id="modal-comments"></div>
            <div class="comment-input-container">
                <input type="text" class="comment-input" placeholder="Leave a whisper..." id="mod-comment-input">
                <button class="send-comment-btn" id="mod-send-comment">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    content.querySelector('.like-interaction').addEventListener('click', () => toggleLike(article.id));
    content.querySelector('#modal-go-back').addEventListener('click', closeLightbox);

    const commentList = content.querySelector('#modal-comments');
    const unsubscribe = loadComments(article.id, commentList);
    window._currentUnsubscribe = unsubscribe;

    content.querySelector('#mod-send-comment').addEventListener('click', async () => {
        const input = content.querySelector('#mod-comment-input');
        await saveComment(article.id, input.value);
        input.value = '';
    });

    content.querySelector('#mod-comment-input').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const input = content.querySelector('#mod-comment-input');
            await saveComment(article.id, input.value);
            input.value = '';
        }
    });

    lightbox.appendChild(content);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = 'auto';

    if (window._currentUnsubscribe) {
        window._currentUnsubscribe();
        window._currentUnsubscribe = null;
    }

    setTimeout(() => {
        lightboxImg.src = '';
        const existingText = lightbox.querySelector('.article-read-content');
        if (existingText) existingText.remove();
        const existingActions = lightbox.querySelector('.modal-actions-container');
        if (existingActions) existingActions.remove();
        const existingComments = lightbox.querySelector('.comment-section');
        if (existingComments) existingComments.remove();
    }, 300);
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

// --- Writer System ---
const writerTrigger = document.getElementById('writer-trigger');
const writerModal = document.getElementById('writer-modal');
const closeWriter = document.querySelector('.close-writer');
const publishBtn = document.getElementById('publish-btn');
const titleInput = document.getElementById('article-title');
const bodyInput = document.getElementById('article-body');

if (writerTrigger) {
    writerTrigger.addEventListener('click', () => {
        writerModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    closeWriter.addEventListener('click', () => {
        writerModal.classList.remove('open');
        document.body.style.overflow = 'auto';
    });

    publishBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        if (!title || !body) {
            alert("Please write something before publishing.");
            return;
        }

        publishBtn.textContent = "Publishing...";
        const success = await saveArticleToFirebase(title, body);
        publishBtn.textContent = "Publish";

        if (success) {
            alert("Poetry published to cloud successfully! ✨");
            titleInput.value = '';
            bodyInput.value = '';
            writerModal.classList.remove('open');
            document.body.style.overflow = 'auto';
            // renderGallery handled by onSnapshot
            const articleBtn = document.querySelector('.filter-btn[data-filter="articles"]');
            if (articleBtn) articleBtn.click();
        }
    });

    // Secret shortcut to show/hide the writer button: Cmd + Shift + E
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyE') {
            // Disable for mobile/small screens
            if (window.innerWidth <= 768) return;

            e.preventDefault();
            const isHidden = window.getComputedStyle(writerTrigger).display === 'none';
            writerTrigger.style.display = isHidden ? 'flex' : 'none';
            document.body.classList.toggle('admin-mode', isHidden); // Toggle Admin Mode

            if (isHidden) {
                console.log("Writer access granted. ✨");
            }
        }
    });
}

// --- Custom Interaction ---
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;
    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;

    cursorOutline.animate({
        left: `${posX}px`,
        top: `${posY}px`
    }, { duration: 400, fill: "forwards" });
});

const magneticElements = document.querySelectorAll('a, button, .logo, .writer-trigger');
magneticElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        cursorOutline.style.width = '50px';
        cursorOutline.style.height = '50px';
        cursorOutline.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
        cursorOutline.style.borderColor = 'transparent';
    });
    el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
        cursorOutline.style.width = '30px';
        cursorOutline.style.height = '30px';
        cursorOutline.style.backgroundColor = 'transparent';
        cursorOutline.style.border = '1px solid rgba(255, 255, 255, 0.5)';
    });
});

// Filters
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        const items = document.querySelectorAll('.gallery-item');

        items.forEach(item => {
            const isMatch = (filter === 'all') ||
                (filter === 'recent' && item.classList.contains('recent-item')) ||
                (item.dataset.category === filter);

            if (isMatch) {
                item.style.display = 'block';

                item.classList.remove('hidden-filtered');
                setTimeout(() => item.classList.add('visible'), 10);
            } else {
                item.classList.add('hidden-filtered');
                item.classList.remove('visible');
                // Wait for transition before hiding
                setTimeout(() => {
                    if (item.classList.contains('hidden-filtered')) {
                        item.style.display = 'none';
                    }
                }, 500);
            }
        });
    });
});

// --- Audio System ---
const audio = document.getElementById('bg-music');
const soundToggle = document.getElementById('sound-toggle');
let isPlaying = false;

if (audio && soundToggle) {
    audio.volume = 0.4; // Subtle volume

    soundToggle.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
            soundToggle.classList.remove('playing');
            soundToggle.innerHTML = '<span>♪</span>';
        } else {
            audio.play();
            soundToggle.classList.add('playing');
            soundToggle.innerHTML = '<span>IlI</span>'; // Visual equalizer
        }
        isPlaying = !isPlaying;
    });

    // Enforce looping manually just in case
    audio.addEventListener('ended', () => {
        audio.currentTime = 0;
        audio.play();
    });

    // Auto-play attempt on interaction
    const startAudio = () => {
        if (!isPlaying) {
            audio.play().then(() => {
                isPlaying = true;
                soundToggle.classList.add('playing');
                soundToggle.innerHTML = '<span>IlI</span>'; // Visual equalizer

                // Remove all listeners once playing
                ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'].forEach(event => {
                    document.removeEventListener(event, startAudio);
                });
            }).catch(e => {
                console.log("Audio autoplay waiting for interaction");
            });
        }
    };

    // Add listeners for various user interactions
    ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'].forEach(event => {
        document.addEventListener(event, startAudio, { once: true });
    });

    // Try autoplay immediately (will likely fail but worth a shot)
    startAudio();
}

// --- Golden Rain Hearts Animation ---
function triggerGoldenRain() {
    const heartCount = 30; // Number of hearts to rain
    const duration = 4000; // Total duration of the rain effect

    for (let i = 0; i < heartCount; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('golden-heart');
            heart.innerHTML = '💛';

            // Random horizontal position
            const startX = Math.random() * window.innerWidth;
            heart.style.left = `${startX}px`;
            heart.style.top = '-50px';

            // Random animation delay and duration for variety
            const randomDelay = Math.random() * 0.5;
            const randomDuration = 2.5 + Math.random() * 1;
            heart.style.animationDelay = `${randomDelay}s`;
            heart.style.animationDuration = `${randomDuration}s`;

            document.body.appendChild(heart);

            // Cleanup after animation
            setTimeout(() => {
                heart.remove();
            }, (randomDuration + randomDelay) * 1000);
        }, i * (duration / heartCount)); // Stagger the hearts
    }
}

// --- Subscription System ---
function initSubscription() {
    const subBtn = document.getElementById('sub-btn');
    const subEmail = document.getElementById('sub-email');
    const feedback = document.getElementById('sub-feedback');
    const subModal = document.getElementById('sub-success-modal');
    const closeSubModal = document.querySelector('.close-sub-modal');

    // Close Modal Logic
    if (closeSubModal && subModal) {
        closeSubModal.addEventListener('click', () => {
            subModal.classList.remove('open');
        });
        subModal.addEventListener('click', (e) => {
            if (e.target === subModal) subModal.classList.remove('open');
        });
    }

    if (!subBtn || !subEmail) return;

    subBtn.addEventListener('click', async () => {
        const email = subEmail.value.trim();

        // Basic Validation
        if (!email || !email.includes('@')) {
            showFeedback("The shadows require a valid email...");
            return;
        }

        subBtn.disabled = true;
        subBtn.innerText = "...";

        try {
            await db.collection("subscribers").add({
                email: email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Cinematic Success
            subEmail.value = "";

            // Show Modal
            if (subModal) {
                subModal.classList.add('open');
                // Trigger golden rain hearts
                triggerGoldenRain();
            } else {
                showFeedback("You are now part of the silence. ✨");
            }

            triggerHeartPopup();

            setTimeout(() => {
                subBtn.disabled = false;
                subBtn.innerText = "Subscribe";
            }, 3000);

        } catch (e) {
            console.error("Subscription error:", e);
            showFeedback("The shadows are busy. Try again later.");
            subBtn.disabled = false;
            subBtn.innerText = "Subscribe";
        }
    });

    function showFeedback(msg) {
        if (!feedback) return;
        feedback.innerText = msg;
        feedback.classList.add('visible');
        setTimeout(() => {
            feedback.classList.remove('visible');
        }, 4000);
    }
}

// --- Admin Promotion Feature ---
async function promoteToRecent(data) {
    const confirmPromote = confirm("Push this photo to Recent? It will appear at the top.");
    if (!confirmPromote) return;

    try {
        if (data.type === 'image') {
            // Check if it's already a dynamic article
            if (data.timestamp) {
                // Update existing
                await db.collection('articles').doc(data.id).update({
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // It's a static image, create a new dynamic entry
                await db.collection('articles').add({
                    type: 'image',
                    src: data.src,
                    title: 'Featured Image', // Optional title
                    category: 'poetry', // Or photography
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            alert("Promoted to Recents! ✨");
        } else {
            // Text article promotion
            await db.collection('articles').doc(data.id).update({
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Article Bumped to Top! 🖊️");
        }
    } catch (e) {
        console.error("Promotion failed:", e);
        alert("Failed to promote.");
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderGallery();
    initRealtimeUpdates();
    initLikeSystem();
    initHeroCollage();
    initGlobalWhispers();
    initWriterUI();
    initSubscription(); // New subscription system
    initVisitCounter();
});
