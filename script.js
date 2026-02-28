// --- Security & Anti-Debug Layer ---
(function () {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (
            e.keyCode === 123 || 
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
            (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) || 
            (e.ctrlKey && e.keyCode === 85)
        ) {
            e.preventDefault();
        }
    });

    setInterval(() => {
        if (window.outerHeight - window.innerHeight > 160 || window.outerWidth - window.innerWidth > 160) {
            console.clear();
            console.log("%cThe Wayfarer's path is not found in the console.", "color: #D4AF37; font-size: 18px; font-weight: bold;");
        }
    }, 1000);
})();

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Configuration
const totalImages = 26;
const imageFolder = 'my galary';
const galleryGrid = document.getElementById('gallery-grid');
let localArticles = [];
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
        if (total > lastTotalLikes && lastTotalLikes !== 0) {
            triggerHeartPopup();
        }
        lastTotalLikes = total;
        updateLikeUI(total);
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
    if (isLiked) {
        delete likedItems[id];
        galleryLikes[id] = (galleryLikes[id] || 1) - 1;
    } else {
        likedItems[id] = true;
        galleryLikes[id] = (galleryLikes[id] || 0) + 1;
        triggerHeartPopup();
    }
    localStorage.setItem('poet_liked_items', JSON.stringify(likedItems));
    updateLikeUI();
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

function triggerHeartPopup(isGolden = false) {
    const heartCount = isGolden ? 15 : 8;
    for (let i = 0; i < heartCount; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('floating-heart');
            if (isGolden) heart.classList.add('golden-style');
            heart.innerHTML = isGolden ? '✨' : '❤';
            const startX = (window.innerWidth / 2) + (Math.random() * 240 - 120);
            const startY = window.innerHeight * 0.85;
            const randomSize = 0.8 + Math.random() * 1.5;
            const randomRotation = Math.random() * 60 - 30;
            heart.style.left = `${startX}px`;
            heart.style.top = `${startY}px`;
            heart.style.transform = `scale(${randomSize}) rotate(${randomRotation}deg)`;
            document.body.appendChild(heart);
            setTimeout(() => heart.remove(), 2000);
        }, i * (isGolden ? 80 : 150));
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
        const shareData = { title: shareTitle, text: shareText, url: shareUrl };
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
            if (err.name !== 'AbortError') console.log('Error sharing:', err);
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareUrl);
            showGlobalFeedback("Link copied to clipboard! ✨");
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }
}

function showGlobalFeedback(msg) {
    const feedback = document.getElementById('sub-feedback');
    if (!feedback) return;
    feedback.innerText = msg;
    feedback.classList.add('visible');
    const rect = feedback.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => feedback.classList.remove('visible'), 4000);
}

function initRealtimeUpdates() {
    db.collection("articles").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        localArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery();
        if (!window._initialDeepLinkHandled) {
            handleDeepLinking();
            window._initialDeepLinkHandled = true;
        }
    });
}

function handleDeepLinking() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    if (hash.startsWith('img-')) {
        const index = parseInt(hash.split('-')[1]);
        const src = encodeURI(`${imageFolder}/${index}.jpg`);
        openLightbox(src, hash);
    } else {
        const article = localArticles.find(a => a.id === hash);
        if (article) {
            if (article.type === 'image') openLightbox(article.src, article.id);
            else openTextModal(article);
        }
    }
}

window.addEventListener('hashchange', handleDeepLinking);

async function saveArticleToFirebase(title, body) {
    try {
        await db.collection("articles").add({
            title, body, date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text'
        });
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
}

// --- Preloader ---
window.addEventListener('load', () => {
    const preloader = document.querySelector('.preloader');
    const progressBar = document.querySelector('.progress-bar');
    const percentage = document.querySelector('.loading-percentage');
    if (preloader && progressBar && percentage) {
        const quoteText = document.querySelector('.preloader-quote');
        if (quoteText) {
            const originalText = quoteText.textContent.trim();
            quoteText.textContent = '';
            let i = 0;
            const typeQuote = () => {
                if (i <= originalText.length) {
                    if (i < originalText.length) quoteText.textContent += originalText.charAt(i);
                    const progress = Math.min(100, Math.floor((i / originalText.length) * 100));
                    progressBar.style.width = progress + '%';
                    percentage.textContent = progress + '%';
                    if (i === originalText.length) {
                        quoteText.classList.add('shine');
                        setTimeout(() => {
                            preloader.classList.add('hidden');
                            initTypewriter();
                            initScrollReveal();
                            triggerHeartPopup(true);
                            setTimeout(() => triggerHeartPopup(false), 500);
                        }, 1200);
                    } else {
                        i++;
                        setTimeout(typeQuote, 50);
                    }
                }
            };
            setTimeout(typeQuote, 100);
        } else {
            preloader.classList.add('hidden');
            initTypewriter();
            initScrollReveal();
        }
    }
});

function initTypewriter() {
    const phrases = ["words that linger...", "thoughts unspoken...", "verses of the heart...", "echoes in silence...", "ink on paper...", "stories untold..."];
    const typewriterText = document.querySelector('.typewriter-text');
    if (!typewriterText) return;
    let phraseIndex = 0, charIndex = 0, isDeleting = false;
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
            typeSpeed = 2000; isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; typeSpeed = 500;
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
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.6;
        this.isInk = Math.random() > 0.8;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.02 - 0.01;
    }
    update() {
        if (mouse.x && mouse.y) {
            let dx = this.x - mouse.x, dy = this.y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) { this.x += dx / 20; this.y += dy / 20; }
        }
        this.x += this.speedX; this.y += this.speedY; this.angle += this.spin;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity * 0.4})`;
        if (this.isInk) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                let r = this.size * (0.8 + Math.random() * 0.4), a = (i / 5) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath(); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    const numberOfParticles = (canvas.width * canvas.height) / 9000;
    for (let i = 0; i < numberOfParticles; i++) particles.push(new Particle());
}
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    connectParticles();
    requestAnimationFrame(animateParticles);
}
function connectParticles() {
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            let distance = ((particles[a].x - particles[b].x) ** 2) + ((particles[a].y - particles[b].y) ** 2);
            if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                let opacityValue = 1 - (distance / 20000);
                if (opacityValue > 0) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.05})`;
                    ctx.beginPath(); ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke();
                }
            }
        }
    }
}
initParticles(); animateParticles();

// --- Hero Collage ---
function initHeroCollage() {
    const rows = document.querySelectorAll('.collage-row');
    if (!rows.length) return;
    const indices = Array.from({ length: totalImages }, (_, i) => i + 1);
    rows.forEach(row => {
        let rowIndices = [...indices].sort(() => Math.random() - 0.5);
        const displayList = [...rowIndices.slice(0, 12), ...rowIndices.slice(0, 12)];
        displayList.forEach(i => {
            const img = document.createElement('img');
            img.src = encodeURI(`${imageFolder}/${i}.jpg`);
            img.classList.add('collage-img');
            img.style.opacity = (0.6 + Math.random() * 0.4).toFixed(2);
            row.appendChild(img);
        });
    });
}

// --- Gallery Logic ---
function renderGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    const now = Date.now(), FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
    const dynamicImageSources = new Set(localArticles.filter(a => a.type === 'image').map(a => a.src));
    let items = [];
    for (let i = 1; i <= totalImages; i++) {
        const imgSrc = encodeURI(`${imageFolder}/${i}.jpg`);
        if (dynamicImageSources.has(imgSrc)) continue;
        items.push({ type: 'image', src: imgSrc, id: `id-${i}`, category: 'poetry', isRecent: (i === 26) });
    }
    const sortedArticles = [...localArticles].sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0));
    sortedArticles.forEach((art, index) => {
        const timestamp = art.timestamp?.toDate().getTime() || now;
        const isRecent = index < 4 && (now - timestamp) < FOUR_DAYS_MS;
        items.push({ type: 'text', category: 'articles', ...art, isRecent: isRecent, isExpired: !isRecent });
    });
    items.sort((a, b) => (a.isRecent === b.isRecent) ? Math.random() - 0.5 : (a.isRecent ? -1 : 1));
    items.forEach(data => {
        const item = document.createElement('div');
        item.classList.add('gallery-item');
        if (data.isRecent) item.classList.add('recent-item');
        if (data.isExpired) item.classList.add('expired');
        if (data.type === 'image') {
            const img = document.createElement('img'); img.src = data.src; img.loading = 'lazy';
            img.onerror = function() { this.src = 'https://via.placeholder.com/600x800/111/D4AF37?text=Poetry+Piece'; };
            const overlay = document.createElement('div'); overlay.classList.add('item-overlay');
            overlay.innerHTML = `<span class="view-label">View Piece</span><button class="admin-promote-btn">⚡ Promote</button>
                <div class="item-actions"><div class="like-interaction" data-id="${data.id}"><span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span><span class="like-count">${galleryLikes[data.id] || 0}</span></div>
                <div class="share-btn"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45-1-1-1z"/></svg></div></div>`;
            item.appendChild(img); item.appendChild(overlay);
            overlay.querySelector('.admin-promote-btn').addEventListener('click', e => { e.stopPropagation(); promoteToRecent(data); });
            overlay.querySelector('.like-interaction').addEventListener('click', e => { e.stopPropagation(); toggleLike(data.id); });
            overlay.querySelector('.share-btn').addEventListener('click', e => { e.stopPropagation(); sharePiece(data); });
            item.addEventListener('click', () => openLightbox(data.src, data.id));
            addTiltEffect(item, img);
        } else {
            item.classList.add('article-card');
            item.innerHTML = `<div class="article-title">${data.title}</div><div class="article-excerpt">${data.body}</div>
                <div class="article-footer"><span class="read-more">Read Piece</span><div class="article-actions-row">
                <div class="like-interaction" data-id="${data.id}"><span class="like-heart ${likedItems[data.id] ? 'liked' : ''}">❤</span><span class="like-count">${galleryLikes[data.id] || 0}</span></div>
                <div class="share-btn"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45-1-1-1z"/></svg></div></div></div>`;
            item.querySelector('.like-interaction').addEventListener('click', e => { e.stopPropagation(); toggleLike(data.id); });
            item.querySelector('.share-btn').addEventListener('click', e => { e.stopPropagation(); sharePiece(data); });
            item.addEventListener('click', () => openTextModal(data));
            addTiltEffect(item, item);
        }
        galleryGrid.appendChild(item);
    });
    setTimeout(() => { initScrollReveal(); document.querySelectorAll('.gallery-item').forEach((item, i) => { if (i < 6) item.classList.add('visible'); }); }, 100);
}

function addTiltEffect(container, target) {
    container.addEventListener('mousemove', e => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const centerX = rect.width / 2, centerY = rect.height / 2;
        target.style.transform = `perspective(1000px) rotateX(${(centerY - y) / centerY * 5}deg) rotateY(${(x - centerX) / centerX * 5}deg) scale(1.02)`;
    });
    container.addEventListener('mouseleave', () => { target.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'; });
}

function initScrollReveal() {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); }, { threshold: 0.1 });
    document.querySelectorAll('.gallery-item, h2, p, .about-grid, .about-image-wrapper, .about-text-content, .reveal-text, .looping-message-frame').forEach(el => observer.observe(el));
}

// --- Lightbox & text Modal ---
const lightbox = document.getElementById('lightbox'), lightboxImg = document.getElementById('lightbox-img'), closeBtn = document.querySelector('.close-lightbox');
function openLightbox(src, id) {
    lightboxImg.style.display = 'block'; lightboxImg.src = src;
    ['.article-read-content', '.modal-actions-container'].forEach(sig => { const el = lightbox.querySelector(sig); if (el) el.remove(); });
    const actions = document.createElement('div'); actions.classList.add('modal-actions-container');
    actions.innerHTML = `<button class="modal-like-btn like-interaction" data-id="${id}"><span class="like-heart ${likedItems[id] ? 'liked' : ''}">❤</span><span>Like Piece</span><span class="like-count">(${galleryLikes[id] || 0})</span></button>
        <button class="modal-like-btn go-back-btn" id="lightbox-go-back"><span>Go Back</span></button>`;
    actions.querySelector('.like-interaction').addEventListener('click', () => toggleLike(id));
    actions.querySelector('#lightbox-go-back').addEventListener('click', closeLightbox);
    lightbox.appendChild(actions); lightbox.classList.add('open'); document.body.style.overflow = 'hidden';
}
function openTextModal(article) {
    lightboxImg.style.display = 'none';
    ['.article-read-content', '.modal-actions-container'].forEach(sig => { const el = lightbox.querySelector(sig); if (el) el.remove(); });
    const content = document.createElement('div'); content.classList.add('article-read-content', 'article-read-modal');
    content.innerHTML = `<h2>${article.title}</h2><p>${article.body}</p><div class="modal-actions-container">
        <button class="modal-like-btn like-interaction" data-id="${article.id}"><span class="like-heart ${likedItems[article.id] ? 'liked' : ''}">❤</span><span>Like Piece</span><span class="like-count">(${galleryLikes[article.id] || 0})</span></button>
        <button class="modal-like-btn go-back-btn" id="modal-go-back"><span>Go Back</span></button></div>`;
    content.querySelector('.like-interaction').addEventListener('click', () => toggleLike(article.id));
    content.querySelector('#modal-go-back').addEventListener('click', closeLightbox);
    lightbox.appendChild(content); lightbox.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = 'auto'; setTimeout(() => { lightboxImg.src = ''; ['.article-read-content', '.modal-actions-container', '.comment-section'].forEach(sig => { const el = lightbox.querySelector(sig); if (el) el.remove(); }); }, 300); }
if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

// --- Writer System ---
function initWriterUI() {
    const trigger = document.getElementById('writer-trigger'), modal = document.getElementById('writer-modal'), close = document.querySelector('.close-writer'), publish = document.getElementById('publish-btn');
    if (!trigger) return;
    trigger.addEventListener('click', () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; });
    close.addEventListener('click', () => { modal.classList.remove('open'); document.body.style.overflow = 'auto'; });
    publish.addEventListener('click', async () => {
        const title = document.getElementById('article-title').value.trim(), body = document.getElementById('article-body').value.trim();
        if (!title || !body) return alert("Please write something.");
        publish.textContent = "Publishing...";
        if (await saveArticleToFirebase(title, body)) { alert("Published! ✨"); modal.classList.remove('open'); document.body.style.overflow = 'auto'; }
        publish.textContent = "Publish";
    });
    window.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyE' && window.innerWidth > 768) { e.preventDefault(); trigger.style.display = trigger.style.display === 'none' ? 'flex' : 'none'; } });
}

// --- Custom Interaction ---
const cursorDot = document.querySelector('.cursor-dot'), cursorOutline = document.querySelector('.cursor-outline');
window.addEventListener('mousemove', e => {
    const posX = e.clientX, posY = e.clientY;
    cursorDot.style.left = `${posX}px`; cursorDot.style.top = `${posY}px`;
    cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 400, fill: "forwards"});
});
document.querySelectorAll('a, button, .logo, .writer-trigger').forEach(el => {
    el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - rect.left - rect.width/2)*0.2}px, ${(e.clientY - rect.top - rect.height/2)*0.2}px)`;
        cursorOutline.style.width = '50px'; cursorOutline.style.height = '50px'; cursorOutline.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'; cursorOutline.style.borderColor = 'transparent';
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0, 0)'; cursorOutline.style.width = '30px'; cursorOutline.style.height = '30px'; cursorOutline.style.backgroundColor = 'transparent'; cursorOutline.style.border = '1px solid rgba(255, 255, 255, 0.5)'; });
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.gallery-item').forEach(item => {
            const match = (f === 'all') || (f === 'recent' && item.classList.contains('recent-item')) || (item.dataset.category === f);
            if (match) { item.style.display = 'block'; item.classList.remove('hidden-filtered'); setTimeout(() => item.classList.add('visible'), 10); }
            else { item.classList.add('hidden-filtered'); item.classList.remove('visible'); setTimeout(() => { if (item.classList.contains('hidden-filtered')) item.style.display = 'none'; }, 500); }
        });
    });
});

// Audio
const audio = document.getElementById('bg-music'), soundToggle = document.getElementById('sound-toggle');
let isPlaying = false;
if (audio && soundToggle) {
    audio.volume = 0.4;
    soundToggle.addEventListener('click', () => {
        if (isPlaying) { audio.pause(); soundToggle.classList.remove('playing'); soundToggle.innerHTML = '<span>♪</span>'; }
        else { audio.play(); soundToggle.classList.add('playing'); soundToggle.innerHTML = '<span>IlI</span>'; }
        isPlaying = !isPlaying;
    });
    const startAudio = () => { if (!isPlaying) audio.play().then(() => { isPlaying = true; soundToggle.classList.add('playing'); soundToggle.innerHTML = '<span>IlI</span>'; ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, startAudio)); }); };
    ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, startAudio, { once: true }));
}

// Golden Rain
function triggerGoldenRain() {
    const count = 30;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const h = document.createElement('div'); h.classList.add('golden-heart'); h.innerHTML = '💛';
            const x = Math.random() * window.innerWidth, delay = Math.random() * 0.5, dur = 2.5 + Math.random();
            h.style.left = `${x}px`; h.style.top = '-50px'; h.style.animationDelay = `${delay}s`; h.style.animationDuration = `${dur}s`;
            document.body.appendChild(h); setTimeout(() => h.remove(), (dur + delay) * 1000);
        }, i * 133);
    }
}

// Subscription
function initSubscription() {
    const btn = document.getElementById('sub-btn'), email = document.getElementById('sub-email'), modal = document.getElementById('sub-success-modal');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const val = email.value.trim();
        if (!val || !val.includes('@')) return;
        btn.disabled = true; btn.innerText = "...";
        try {
            await db.collection("subscribers").add({ email: val, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            email.value = ""; if (modal) modal.classList.add('open'); triggerGoldenRain(); triggerHeartPopup();
        } catch (e) { console.error(e); }
        finally { setTimeout(() => { btn.disabled = false; btn.innerText = "Subscribe"; }, 3000); }
    });
    if (modal) { document.querySelector('.close-sub-modal').addEventListener('click', () => modal.classList.remove('open')); modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); }); }
}

async function promoteToRecent(data) {
    if (!confirm("Promote to Recent?")) return;
    try {
        if (data.type === 'image' && !data.timestamp) await db.collection('articles').add({ type: 'image', src: data.src, category: 'poetry', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        else await db.collection('articles').doc(data.id).update({ timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Promoted! ✨");
    } catch (e) { console.error(e); }
}

class AudioVisualizer {
    constructor(audio) { this.audio = audio; this.isInitialized = false; }
    init() {
        if (this.isInitialized) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            const src = this.context.createMediaElementSource(this.audio);
            this.analyzer = this.context.createAnalyser(); this.analyzer.fftSize = 256;
            src.connect(this.analyzer); this.analyzer.connect(this.context.destination);
            this.data = new Uint8Array(this.analyzer.frequencyBinCount); this.isInitialized = true; this.animate();
        } catch (e) { console.log(e); }
    }
    animate() {
        if (!this.isInitialized) return; requestAnimationFrame(() => this.animate());
        this.analyzer.getByteFrequencyData(this.data);
        let sum = 0; for (let i = 0; i < 10; i++) sum += this.data[i];
        const intensity = sum / 10 / 255;
        document.documentElement.style.setProperty('--border-opacity', (0.1 + intensity * 0.9).toFixed(2));
        document.documentElement.style.setProperty('--glow-spread', `${(intensity * 25).toFixed(1)}px`);
        document.documentElement.style.setProperty('--glow-opacity', (intensity * 0.6).toFixed(2));
        document.querySelectorAll('.nav-logo, .global-likes-container').forEach(el => {
            el.style.transform = `scale(${1 + intensity * 0.15})`;
            el.style.filter = sum / 10 > 140 ? `drop-shadow(0 0 ${sum / 10 / 8}px rgba(212, 175, 55, 0.5))` : 'none';
        });
    }
}
let visualizer = null;
function initCursorTrail() {
    const canvas = document.getElementById('cursor-trail'), ctx = canvas.getContext('2d');
    let points = []; const max = 25;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();
    window.addEventListener('mousemove', e => { points.push({ x: e.clientX, y: e.clientY }); if (points.length > max) points.shift(); });
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (points.length > 1) {
            ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) { const xc = (points[i].x + points[i-1].x) / 2, yc = (points[i].y + points[i-1].y) / 2; ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, xc, yc); }
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
        }
        requestAnimationFrame(draw);
    }
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    const safeInit = (name, fn) => { try { fn(); console.log(`Initialized: ${name} ✨`); } catch (e) { console.error(`Failed: ${name}`, e); } };
    safeInit('Likes', initLikeSystem); safeInit('Realtime', initRealtimeUpdates); safeInit('HeroCollage', initHeroCollage);
    safeInit('WriterUI', initWriterUI); safeInit('Subscription', initSubscription); safeInit('CursorTrail', initCursorTrail);
    const bgMusic = document.getElementById('bg-music'); if (bgMusic) visualizer = new AudioVisualizer(bgMusic);
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const messaging = firebase.messaging();
        const req = async () => {
            try {
                if (await Notification.requestPermission() === 'granted') {
                    const token = await messaging.getToken({ vapidKey: 'BMJ8jI_J-k9vW2Z5X_4J_5Q-uX9_J_k9vW2Z5X_4J_5Q' });
                    if (token) await db.collection('notification_tokens').doc(token).set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                }
            } catch (err) {}
        };
        setTimeout(req, 5000);
    }
});
