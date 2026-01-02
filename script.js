// =======================================================
// Master-Skript für Flow (VEREINFACHTE VERSION MIT STARTBILDSCHIRM)
// =======================================================

const APP_DATA_KEY = 'flowUserApps';

// =======================================================
// Logik für den Startbildschirm (index.html)
// =======================================================
function handleIndexPage() {
    // Leitet nach 5 Sekunden zur Hauptseite weiter
    setTimeout(function() {
        window.location.href = 'main.html';
    }, 5000); // 5000 Millisekunden = 5 Sekunden
}

// =======================================================
// Logik für die Auswahlseite (selection.html)
// =======================================================
function handleSelectionPage() {
    const form = document.getElementById('app-selection-form');

    if (!form) return;

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const checkboxes = form.querySelectorAll('input[name="apps"]:checked');
        const selectedApps = Array.from(checkboxes).map(checkbox => checkbox.value);
        
        localStorage.setItem(APP_DATA_KEY, JSON.stringify(selectedApps));
        
        window.location.href = 'main.html';
    });

    document.addEventListener('DOMContentLoaded', () => {
        const storedApps = localStorage.getItem(APP_DATA_KEY);
        if (storedApps) {
            const userApps = JSON.parse(storedApps);
            const checkboxes = form.querySelectorAll('input[name="apps"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = userApps.includes(checkbox.value);
            });
        }
    });
}


// =======================================================
// Router-Logik: Führt die richtige Funktion aus
// =======================================================
function initializePage() {
    const page = window.location.pathname.split('/').pop();

    if (page === 'index.html' || page === '') {
        handleIndexPage();
    } else if (page === 'selection.html') {
        handleSelectionPage();
    }
    // main.html braucht keine Router-Logik, da das Skript dort direkt eingebettet ist.
}

document.addEventListener('DOMContentLoaded', initializePage);
