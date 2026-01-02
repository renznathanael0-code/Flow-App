/**
 * Smart Wardrobe Pro - Komplettversion
 * Funktionen: IndexedDB, Bild-Kompression, Wetter-API, Wetter-Override, Optionales Zubehör
 */

let db;
let currentTemp = 20; 
let isRaining = false;

// 1. DATENBANK & WETTER INITIALISIEREN
const request = indexedDB.open("WardrobeDB", 1);

request.onupgradeneeded = (e) => {
    const database = e.target.result;
    if (!database.objectStoreNames.contains("items")) {
        database.createObjectStore("items", { keyPath: "id" });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    initApp();
};

async function initApp() {
    await fetchWeather();
    updateUI();
}

// 2. WETTER-ABFRAGE (Open-Meteo API)
async function fetchWeather() {
    const widget = document.getElementById('weatherWidget');
    if (!navigator.geolocation) {
        widget.innerText = "Wetter: Standort nicht unterstützt";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,rain`);
            const data = await res.json();
            currentTemp = data.current.temperature_2m;
            isRaining = data.current.rain > 0;
            const rainInfo = isRaining ? " ☔ (Regengefahr)" : "";
            widget.innerText = `Aktuell: ${currentTemp}°C${rainInfo}`;
        } catch (err) {
            widget.innerText = "Wetter: Fehler beim Laden";
        }
    }, () => {
        widget.innerText = "Wetter: Standortzugriff benötigt";
    });
}

// 3. BILD-KOMPRESSION (Verkleinert Fotos für die DB)
function resizeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * (MAX_WIDTH / img.width);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 4. ELEMENT HINZUFÜGEN
async function addItem() {
    const nameEl = document.getElementById('itemName');
    const catEl = document.getElementById('itemCategory');
    const occEl = document.getElementById('itemOccasion');
    const tagEl = document.getElementById('itemWeatherTag');
    const fileInput = document.getElementById('itemImage');

    if (!nameEl.value) {
        alert("Bitte gib einen Namen ein!");
        return;
    }

    let imgData = null;
    if (fileInput.files && fileInput.files[0]) {
        imgData = await resizeImage(fileInput.files[0]);
    }

    const item = { 
        id: Date.now(), 
        name: nameEl.value, 
        category: catEl.value, 
        occasion: occEl.value || "Alltag", 
        weatherTag: tagEl.value, 
        image: imgData, 
        isDirty: false 
    };

    const tx = db.transaction("items", "readwrite");
    tx.objectStore("items").add(item);
    tx.oncomplete = () => {
        updateUI();
        // Reset Formular & Foto-Speicher
        nameEl.value = "";
        fileInput.value = ""; 
    };
}

// 5. OUTFIT GENERATOR (Mit Wetter-Check und Optionalem Zubehör)
function generateOutfit(ignoreWeather = false) {
    const occ = document.getElementById('selectOccasion').value;
    if (!occ || occ === "Keine Anlässe") return alert("Lege erst Kleidung an!");

    let pool = [];
    let targetTag = "mild";
    if (currentTemp < 15) targetTag = "kalt";
    if (currentTemp > 22) targetTag = "heiß";

    const tx = db.transaction("items", "readonly");
    const store = tx.objectStore("items");

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const it = cursor.value;
            if (!it.isDirty && it.occasion === occ) {
                if (ignoreWeather) {
                    pool.push(it);
                } else {
                    // Filter: Wetter-Tag oder Regen-Zubehör
                    if (it.weatherTag === targetTag || (isRaining && it.weatherTag === "regen") || it.category === "Zubehör") {
                        pool.push(it);
                    }
                }
            }
            cursor.continue();
        } else {
            // Auswertung des Pools
            const tops = pool.filter(i => i.category === "Oberteil");
            const bottoms = pool.filter(i => i.category === "Hose");
            const shoes = pool.filter(i => i.category === "Schuhe");
            const accs = pool.filter(i => i.category === "Zubehör");

            if (tops.length && bottoms.length && shoes.length) {
                const selection = [
                    tops[Math.floor(Math.random() * tops.length)],
                    bottoms[Math.floor(Math.random() * bottoms.length)],
                    shoes[Math.floor(Math.random() * shoes.length)]
                ];
                
                // Zubehör nur hinzufügen, wenn vorhanden
                if (accs.length > 0) {
                    selection.push(accs[Math.floor(Math.random() * accs.length)]);
                }
                
                renderModal(selection);
            } else {
                if (!ignoreWeather) {
                    const retry = confirm(`Keine passende Kleidung für ${targetTag}es Wetter gefunden. Trotzdem ein Outfit aus allen sauberen "${occ}"-Sachen erstellen?`);
                    if (retry) generateOutfit(true);
                } else {
                    alert(`Du hast nicht genug saubere Teile für den Anlass "${occ}".`);
                }
            }
        }
    };
}

// 6. UI AKTUALISIEREN
function updateUI() {
    const area = document.getElementById('displayArea');
    const selectOcc = document.getElementById('selectOccasion');
    area.innerHTML = "";
    const occasions = new Set();

    const tx = db.transaction("items", "readonly");
    tx.objectStore("items").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const item = cursor.value;
            occasions.add(item.occasion);
            const card = document.createElement('div');
            card.className = `card ${item.isDirty ? 'dirty' : ''}`;
            card.innerHTML = `
                <button class="delete-btn" onclick="deleteItem(${item.id})">🗑️</button>
                ${item.image ? `<img src="${item.image}">` : `<div class="image-placeholder">${getEmoji(item.category)}</div>`}
                <div style="padding:8px">
                    <strong>${item.name}</strong><br>
                    <small>${item.category} | ${item.occasion}</small>
                </div>
                <button class="laundry-btn" onclick="toggleDirty(${item.id})">
                    ${item.isDirty ? '🧼 Sauber machen' : '🧺 In die Wäsche'}
                </button>
            `;
            area.appendChild(card);
            cursor.continue();
        } else {
            const options = Array.from(occasions).map(o => `<option value="${o}">${o}</option>`).join('');
            selectOcc.innerHTML = options || '<option>Keine Anlässe</option>';
        }
    };
}

// 7. HILFSFUNKTIONEN (Modal, Delete, Dirty-Toggle)
function renderModal(selection) {
    const display = document.getElementById('outfitDisplay');
    display.innerHTML = selection.map(i => `
        <div style="background:#f3f4f6; padding:10px; border-radius:10px; text-align:center">
            ${i.image ? `<img src="${i.image}" style="width:100%; border-radius:8px">` : `<div style="font-size:40px">${getEmoji(i.category)}</div>`}
            <div style="font-size:13px; font-weight:bold; margin-top:8px">${i.name}</div>
        </div>
    `).join('');
    window.currentIds = selection.map(s => s.id);
    document.getElementById('wardrobeModal').style.display = "block";
}

function deleteItem(id) { 
    if(confirm("Teil wirklich löschen?")) {
        const tx = db.transaction("items", "readwrite");
        tx.objectStore("items").delete(id).onsuccess = () => updateUI(); 
    }
}

function toggleDirty(id) { 
    const store = db.transaction("items", "readwrite").objectStore("items");
    store.get(id).onsuccess = (e) => {
        const it = e.target.result; 
        it.isDirty = !it.isDirty; 
        store.put(it).onsuccess = () => updateUI();
    };
}

function wearOutfit() {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    const promises = window.currentIds.map(id => {
        return new Promise(resolve => {
            store.get(id).onsuccess = (e) => {
                const it = e.target.result;
                if (it) { it.isDirty = true; store.put(it); }
                resolve();
            };
        });
    });
    Promise.all(promises).then(() => { 
        closeModal(); 
        setTimeout(updateUI, 200); 
    });
}

function closeModal() { document.getElementById('wardrobeModal').style.display = "none"; }
function getEmoji(c) { return {"Oberteil":"👕","Hose":"👖","Schuhe":"👟","Zubehör":"🕶️"}[c] || "👗"; }

