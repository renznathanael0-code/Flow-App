// =======================================================
// Master-Skript für Flow
// =======================================================

const APP_DATA_KEY = 'flowUserApps';

// Logik für den Startbildschirm (index.html)
function handleIndexPage() {
    setTimeout(function() {
        window.location.href = 'main.html';
    }, 5000); 
}

// Logik für die Auswahlseite (selection.html)
function handleSelectionPage() {
    const form = document.getElementById('app-selection-form');
    if (!form) return;

    // Speichern beim Absenden
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const checkboxes = form.querySelectorAll('input[name="apps"]:checked');
        const selectedApps = Array.from(checkboxes).map(checkbox => checkbox.value);
        
        localStorage.setItem(APP_DATA_KEY, JSON.stringify(selectedApps));
        window.location.href = 'main.html';
    });

    // Vorhandene Auswahl laden
    const storedApps = localStorage.getItem(APP_DATA_KEY);
    if (storedApps) {
        const userApps = JSON.parse(storedApps);
        const checkboxes = form.querySelectorAll('input[name="apps"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = userApps.includes(checkbox.value);
        });
    }
}

// Router: Erkennt die Seite auf Netlify (auch ohne .html Ende)
function initializePage() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
        handleIndexPage();
    } else if (path.includes('selection')) {
        handleSelectionPage();
    }
}

// Sofort ausführen
initializePage();
