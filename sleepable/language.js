// language.js
// A rock-solid language switcher using CSS classes!
// 
// HOW IT WORKS:
// The script adds a class to the <body> tag: either <body class="lang-en"> or <body class="lang-tr">.
// Then, CSS automatically hides any text wrapped in <span class="en"> or <span class="tr"> depending on the body class!

function updateNavLinks(lang) {
    // Ensure all internal links carry the language parameter
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        // Check includes('.html') instead of endsWith so we don't skip links that already have ?lang=tr
        if (href && href.includes('.html')) {
            // Unconditionally append the language so isolated file:// localStorage doesn't override it accidentally!
            let newHref = href.split('?')[0]; 
            newHref += `?lang=${lang}`;
            link.setAttribute('href', newHref);
        }
    });
}

function changeLanguage(lang) {
    // Save preference (Might fail if opening files directly on some browsers)
    try {
        localStorage.setItem('sleepable_lang', lang);
    } catch(e) {}
    
    // Update the body class
    document.body.classList.remove('lang-en', 'lang-tr');
    document.body.classList.add(`lang-${lang}`);
    
    // [SPECIAL FIX FOR DROPDOWNS]
    // Options don't support <span> tags or display:none reliably.
    // We swap their text content manually.
    document.querySelectorAll('option[data-tr]').forEach(opt => {
        if (!opt.hasAttribute('data-en')) {
            opt.setAttribute('data-en', opt.textContent);
        }
        opt.textContent = (lang === 'tr') ? opt.getAttribute('data-tr') : opt.getAttribute('data-en');
    });

    // Update the dropdown visually
    const langSelect = document.getElementById('lang-select');
    if (langSelect && langSelect.value !== lang) {
        langSelect.value = lang;
    }

    updateNavLinks(lang);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check URL for language mapping first (?lang=tr)
    const urlParams = new URLSearchParams(window.location.search);
    let savedLang = urlParams.get('lang');
    
    // 2. Check localStorage if no URL param is present
    if (!savedLang) {
        try {
            savedLang = localStorage.getItem('sleepable_lang');
        } catch(e) {}
    }
    
    // 3. Default to English
    savedLang = savedLang || 'en';
    changeLanguage(savedLang);
    
    // Listen for changes from the dropdown
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            const newLang = e.target.value;
            changeLanguage(newLang);
            
            // Update the URL in the address bar so reloading works
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.history.replaceState({}, '', url);
        });
    }
});
