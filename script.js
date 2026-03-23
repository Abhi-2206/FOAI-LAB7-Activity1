'use strict';

// === THEME TOGGLE ===
/**
 * Initialize theme based on user's previous preference stored in localStorage.
 * Required to be at the top to fire before page render completion to avoid flashing.
 */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');

    // Set initial icon
    themeToggle.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        // Add spin animation class
        themeToggle.classList.add('icon-spin');

        // Toggle theme
        if (document.body.classList.contains('light-mode')) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '🌙';
        } else {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '☀️';
        }

        // Remove spin class after animation completes
        setTimeout(() => {
            themeToggle.classList.remove('icon-spin');
        }, 400);
    });

    // Clean up the entrance animation after it completes
    // This prevents success/error state pulses from re-triggering the entrance animation
    setTimeout(() => {
        document.querySelectorAll('.card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.animation = 'none';
        });
    }, 1000);
});

// === UTILITIES ===
/**
 * Sets a card to loading state by disabling buttons and showing spinner
 */
function setLoading(contentId, buttonId) {
    const content = document.getElementById(contentId);
    const btn = document.getElementById(buttonId);

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.dataset.originalText = originalText;
    btn.innerHTML = '<span class="loader-ring"></span> Loading...';

    content.innerHTML = '<div class="loader-ring card-loader"></div>';

    // Reset any error/success states on Card
    content.closest('.card').classList.remove('error-state', 'success-state');

    return btn;
}

/**
 * Handles error display and resets button
 */
function handleError(contentId, btn, errorMessage) {
    const content = document.getElementById(contentId);
    content.innerHTML = `<div class="error-text">❌ ${errorMessage}</div>`;
    content.closest('.card').classList.add('error-state');

    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText;
}

/**
 * Handles success display and triggers success animation
 */
function handleSuccess(contentId, btn) {
    const content = document.getElementById(contentId);
    content.closest('.card').classList.add('success-state');

    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText;

    // Remove animation class so it can be retriggered
    setTimeout(() => {
        content.closest('.card').classList.remove('success-state');
    }, 600);
}


// === DOG FINDER ===
/**
 * Fetches a random dog image from the Dog CEO API
 */
async function fetchDog() {
    const btn = setLoading('dog-content', 'btn-dog');
    const content = document.getElementById('dog-content');

    try {
        const res = await fetch('https://dog.ceo/api/breeds/image/random');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const imgUrl = data.message;

        // Parse breed string
        let breedName = "Unknown Breed";
        const parts = imgUrl.split('/breeds/');
        if (parts.length > 1) {
            breedName = parts[1].split('/')[0]
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }

        content.dataset.url = imgUrl; // store for copy

        // Preload image so it appears at exactly the same time as the text
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = imgUrl;
        });

        content.innerHTML = `
      <img src="${imgUrl}" alt="Random Dog" class="dog-preview" />
      <div class="badge">${breedName}</div>
    `;

        // Update actions area to include copy button if not present
        let actions = content.nextElementSibling;
        if (!document.getElementById('btn-copy-dog')) {
            const copyBtn = document.createElement('button');
            copyBtn.id = 'btn-copy-dog';
            copyBtn.className = 'btn-icon';
            copyBtn.setAttribute('aria-label', 'Copy image URL');
            copyBtn.onclick = copyDogUrl;
            copyBtn.innerHTML = `📋<span class="tooltip">Copy URL</span>`;
            actions.appendChild(copyBtn);
        } else {
            document.getElementById('btn-copy-dog').style.display = 'flex';
        }

        handleSuccess('dog-content', btn);
    } catch (err) {
        console.error(err);
        handleError('dog-content', btn, 'Failed to fetch dog image. Try again.');
        if (document.getElementById('btn-copy-dog')) {
            document.getElementById('btn-copy-dog').style.display = 'none';
        }
    }
}

/**
 * Copies the fetched dog image URL to clipboard
 */
async function copyDogUrl() {
    const content = document.getElementById('dog-content');
    const btn = document.getElementById('btn-copy-dog');
    const url = content.dataset.url;

    if (!url) return;

    try {
        await navigator.clipboard.writeText(url);
        btn.innerHTML = `<span class="check-anim">✅</span><span class="tooltip">Copied!</span>`;
        setTimeout(() => {
            btn.innerHTML = `📋<span class="tooltip">Copy URL</span>`;
        }, 2000);
    } catch (err) {
        alert('Failed to copy');
    }
}


// === JOKE GENERATOR ===
let jokeCount = 0;

/**
 * Fetches a random setup & punchline joke
 */
async function fetchJoke() {
    const getBtn = document.getElementById('btn-joke');
    const nextBtn = document.getElementById('btn-next-joke');
    const activeBtnId = nextBtn.style.display !== 'none' ? 'btn-next-joke' : 'btn-joke';

    const btn = setLoading('joke-content', activeBtnId);
    const content = document.getElementById('joke-content');

    try {
        const res = await fetch('https://official-joke-api.appspot.com/random_joke');
        let data;

        if (res.status === 429) {
            // Provide a graceful fallback due to common 15-minute rate limit on this free API
            data = {
                setup: "Why did the API stop working?",
                punchline: "Because it needed to catch its breath! (Rate limit exceeded, try again later)"
            };
        } else if (!res.ok) {
            throw new Error('API Error');
        } else {
            data = await res.json();
            if (data.type === 'error') throw new Error(data.message);
        }

        jokeCount++;
        const counterBadge = document.getElementById('joke-counter');
        counterBadge.style.display = 'inline-block';
        counterBadge.textContent = 'Joke #' + jokeCount;

        content.innerHTML = `
      <div class="joke-setup">${data.setup}</div>
      <div class="joke-punchline">${data.punchline}</div>
    `;

        handleSuccess('joke-content', btn);

        // Swap buttons
        getBtn.style.display = 'none';
        nextBtn.style.display = 'flex'; // Use flex for btn-primary
    } catch (err) {
        console.error(err);
        handleError('joke-content', btn, 'Failed to fetch joke. Try again.');
    }
}


// === RANDOM USER ===
/**
 * Fetches identity from Random User API
 */
async function fetchUser() {
    const btn = setLoading('user-content', 'btn-user');
    const content = document.getElementById('user-content');

    try {
        const res = await fetch('https://randomuser.me/api/');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const user = data.results[0];

        content.innerHTML = `
      <img src="${user.picture.large}" alt="Avatar" class="user-avatar" />
      <div class="user-name">${user.name.first} ${user.name.last}</div>
      <div class="user-info-row"><span>✉️</span> ${user.email}</div>
      <div class="user-info-row"><span>🌍</span> ${user.location.country}</div>
      <div class="user-info-row"><span>🎂</span> ${user.dob.age} years old</div>
      <div class="user-info-row"><span>📞</span> ${user.phone}</div>
    `;

        handleSuccess('user-content', btn);
    } catch (err) {
        console.error(err);
        handleError('user-content', btn, 'Failed to fetch user. Try again.');
    }
}


// === SAMPLE POST ===
/**
 * Fetches a sample blog post
 */
async function fetchPost() {
    const btn = setLoading('post-content', 'btn-post');
    const content = document.getElementById('post-content');

    try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!res.ok) throw new Error('API Error');
        const post = await res.json();

        content.innerHTML = `
      <div class="post-title">${post.title}</div>
      <div class="post-body" id="post-body-text">${post.body}</div>
      <a href="#" id="read-more-toggle" style="color: var(--accent); font-size: 0.9rem; margin-bottom: 16px; align-self: flex-start; text-decoration: none; font-weight: bold;">Read more</a>
      <div class="post-badges">
        <span class="code-badge">Post ID: ${post.id}</span>
        <span class="code-badge">User ID: ${post.userId}</span>
      </div>
    `;

        document.getElementById('read-more-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            const bodyText = document.getElementById('post-body-text');
            if (bodyText.style.webkitLineClamp === 'unset') {
                bodyText.style.webkitLineClamp = '4';
                e.target.textContent = 'Read more';
            } else {
                bodyText.style.webkitLineClamp = 'unset';
                e.target.textContent = 'Read less';
            }
        });

        handleSuccess('post-content', btn);
    } catch (err) {
        console.error(err);
        handleError('post-content', btn, 'Failed to fetch post. Try again.');
    }
}
