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
const totalImages = 23;
const imageFolder = 'my galary';
const galleryGrid = document.getElementById('gallery-grid');
let localArticles = [];

// --- Like System Data ---
let likedItems = JSON.parse(localStorage.getItem('poet_liked_items')) || {};
let galleryLikes = {};

// --- Data Management (Firestore) ---
function initLikeSystem() {
    db.collection("gallery_likes").onSnapshot((snapshot) => {
        snapshot.docs.forEach(doc => {
            galleryLikes[doc.id] = doc.data().count || 0;
        });
        updateLikeUI();
    });
}

function updateLikeUI() {
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
function initRealtimeUpdates() {
    db.collection("articles").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        localArticles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderGallery();
    });
}

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
                card.innerHTML = `
                    <div class="whisper-info">
                        <div class="whisper-meta">A Wayfarer whispered...</div>
                        <div class="whisper-content">"${data.text}"</div>
                    </div>
                    <div class="whisper-date">${data.date || ''}</div>
                `;
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

    // Add images
    for (let i = 1; i <= totalImages; i++) {
        const imgSrc = `${imageFolder}/${i}.jpg`;
        items.push({
            type: 'image',
            src: encodeURI(imgSrc),
            id: `img-${i}`,
            category: 'poetry'
        });
    }

    // Add text articles
    articles.forEach(art => {
        items.push({
            type: 'text',
            ...art,
            category: 'articles'
        });
    });

    items.sort(() => Math.random() - 0.5);

    items.forEach(data => {
        const item = document.createElement('div');
        item.classList.add('gallery-item');
        item.dataset.category = data.category;

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
                <div class="like-interaction" data-id="${data.id}">
                    <span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span>
                    <span class="like-count">${galleryLikes[data.id] || 0}</span>
                </div>
            `;

            item.appendChild(img);
            item.appendChild(overlay);

            // Separate click for like vs view
            overlay.querySelector('.like-interaction').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(data.id);
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
                    <div class="like-interaction" data-id="${data.id}">
                        <span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span>
                        <span class="like-count">${galleryLikes[data.id] || 0}</span>
                    </div>
                </div>
            `;

            item.querySelector('.like-interaction').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(data.id);
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

    // Secret shortcut to show/hide the writer button: Cmd + Shift + W
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyW') {
            e.preventDefault();
            const isHidden = window.getComputedStyle(writerTrigger).display === 'none';
            writerTrigger.style.display = isHidden ? 'flex' : 'none';

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
            if (filter === 'all' || item.dataset.category === filter) {
                item.style.display = 'block';
                setTimeout(() => item.classList.add('visible'), 50);
            } else {
                item.style.display = 'none';
                item.classList.remove('visible');
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

document.addEventListener('DOMContentLoaded', () => {
    renderGallery(); // Render static images immediately
    initRealtimeUpdates(); // Start listening for cloud articles
    initLikeSystem(); // Start infinite love sync
    initHeroCollage();
    initGlobalWhispers();
});
