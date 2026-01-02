document.addEventListener('DOMContentLoaded', () => {
    // Storage Keys für Local Storage
    const ALLERGIEN_MAPPING_STORAGE_KEY = 'benutzerdefiniertesAllergieMapping';
    const ERSTER_START_STORAGE_KEY = 'ersterAppStart';
    const ALLERGIEN_STORAGE_KEY = 'meineAllergien'; // Key für die persönlichen Allergien
    const KOCHBUCH_ZUTATEN_STORAGE_KEY = 'kochbuchZutaten'; // Key für Kochbuch-Zutaten

    // HTML-Elemente abrufen
    const mappingBearbeitenBereich = document.getElementById('mapping-bearbeiten');
    const mappingFelderDiv = document.getElementById('mapping-felder');
    const mappingSpeichernButton = document.getElementById('mapping-speichern');
    const mappingAbbrechenButton = document.getElementById('mapping-abbrechen');
    const mappingBearbeitenButton = document.getElementById('mapping-bearbeiten-button');
    const eingabeBereich = document.getElementById('eingabe-bereich');

    const neueAllergieNameInput = document.getElementById('neue-allergie-name');
    const neueAllergieBegriffeInput = document.getElementById('neue-allergie-begriffe');
    const allergieMappingHinzufuegenButton = document.getElementById('allergie-mapping-hinzufuegen');
    const neueAllergieInput = document.getElementById('neue-allergie');
    const hinzufuegenAllergieButton = document.getElementById('hinzufuegen-allergie');
    const allergieListeDiv = document.getElementById('allergie-liste');
    const zutatenInput = document.getElementById('zutaten');
    const zutatenVorschlaegeDatalist = document.getElementById('zutaten-vorschlaege');
    const pruefenButton = document.getElementById('pruefen-zutaten');
    const ladenKochbuchZutatenButton = document.getElementById('laden-kochbuch-zutaten'); // Neuer Button
    const ergebnisBereich = document.getElementById('ergebnis-bereich');
    const ergebnisText = document.getElementById('ergebnis-text');
    const gefundeneAllergeneListe = document.getElementById('gefundene-allergene');
    const allergieVorschlaegeDatalist = document.getElementById('allergie-vorschlaege');
    const notfallHinweiseButton = document.getElementById('notfall-hinweise-button');
    const tonAnAusButton = document.getElementById('ton_an_aus_button');

    // Standard-Mapping als Fallback
    const STANDARD_ALLERGIE_MAPPING = {
        'gluten': ['weizen', 'weizenmehl', 'roggen', 'gerste', 'dinkel', 'kamut', 'grünkern', 'triticale', 'emmer', 'einkorn'],
        'milch': ['laktose', 'milchpulver', 'molke', 'kasein', 'butter', 'käse', 'sahnepulver'],
        'nüsse': ['erdnüsse', 'mandel', 'haselnüsse', 'walnüsse', 'cashelnüsse', 'pekannüsse', 'paranüsse', 'pistazien', 'macadamianüsse'],
        'histaminintoleranz': ['tomate', 'spinat', 'aubergine', 'avocado', 'fermentiert', 'sauerkraut', 'käse', 'wurstwaren', 'geräuchert', 'rotwein', 'bier', 'essig', 'zitrusfrüchte', 'hefeextrakt', 'fischkonserven', 'meeresfrüchte'],
        // Füge hier weitere Standard-Allergien hinzu
    };

    // Häufige Zutaten für die Vorschlagsliste (separat vom Mapping)
    const haeufigeZutaten = [
        "weizenmehl", "milch", "ei", "tomaten", "zucker", "salz", "butter", "käse", "hefe", "öl", "essig", "zwiebel", "knoblauch", "kartoffeln", "reis", "nudeln", "hähnchen", "rind", "fisch"
        // Füge hier weitere häufige Zutaten in Kleinbuchstaben hinzu
    ];

    let soundEnabled = true; // Standardmäßig aktiviert

    // Initialisiere persönliche Allergien aus Local Storage (immer)
    let allergien = JSON.parse(localStorage.getItem(ALLERGIEN_STORAGE_KEY)) || [];

    // --- Korrigierte Initialisierung des allergieMapping ---
    let allergieMapping = {};
    const ersterStart = localStorage.getItem(ERSTER_START_STORAGE_KEY) === null;
    const gespeichertesMappingJSON = localStorage.getItem(ALLERGIEN_MAPPING_STORAGE_KEY);

    if (ersterStart || !gespeichertesMappingJSON || Object.keys(JSON.parse(gespeichertesMappingJSON || '{}')).length === 0) {
        // Entweder erster Start ODER kein Mapping gespeichert ODER gespeichertes Mapping ist leer
        allergieMapping = { ...STANDARD_ALLERGIE_MAPPING }; // Starte mit Standard-Mapping
        localStorage.setItem(ALLERGIEN_MAPPING_STORAGE_KEY, JSON.stringify(allergieMapping)); // Speichere es sofort
        localStorage.setItem(ERSTER_START_STORAGE_KEY, 'false'); // Markiere als nicht mehr erster Start

        // Beim ersten Start oder wenn das Mapping leer war, den Bearbeitungsbereich anzeigen
        mappingBearbeitenBereich.classList.remove('hidden');
        eingabeBereich.classList.add('hidden');
        zeigeMappingFelder(allergieMapping); // Zeige das (Standard-)Mapping zum Bearbeiten
    } else {
        // Nicht der erste Start UND ein gültiges, nicht-leeres Mapping ist gespeichert
        allergieMapping = JSON.parse(gespeichertesMappingJSON);
        mappingBearbeitenBereich.classList.add('hidden'); // Hauptbereich anzeigen
        eingabeBereich.classList.remove('hidden');
    }
    // --- Ende der korrigierten Initialisierung ---


    // Funktion zum Anzeigen des Mapping-Bearbeitungsbereichs
    function zeigeMappingBearbeiten() {
        mappingBearbeitenBereich.classList.remove('hidden');
        eingabeBereich.classList.add('hidden'); // Hauptbereich ausblenden

        // Lade das aktuelle Mapping aus dem Local Storage, um den neuesten Stand zu haben
        const gespeichertesMappingJSON = localStorage.getItem(ALLERGIEN_MAPPING_STORAGE_KEY);
        if (gespeichertesMappingJSON && Object.keys(JSON.parse(gespeichertesMappingJSON)).length > 0) {
            allergieMapping = JSON.parse(gespeichertesMappingJSON); // Lade den aktuellen Zustand ins globale Objekt
        } else {
            // Fallback auf Standard, wenn der Speicher leer oder ungültig ist
            allergieMapping = { ...STANDARD_ALLERGIE_MAPPING };
        }
        zeigeMappingFelder(allergieMapping); // Zeige den geladenen/Standard-Zustand an
    }

    // Funktion zum Ausblenden des Mapping-Bearbeitungsbereichs
    function versteckeMappingBearbeiten() {
        mappingBearbeitenBereich.classList.add('hidden');
        eingabeBereich.classList.remove('hidden'); // Hauptbereich wieder einblenden
        // Optional: Felder für neue Allergie leeren
        neueAllergieNameInput.value = '';
        neueAllergieBegriffeInput.value = '';
    }


    // *** Text des Ton-Buttons beim Laden setzen ***
    if (tonAnAusButton) {
        tonAnAusButton.textContent = soundEnabled ? 'Hinweissignal Aus' : 'Hinweissignal An';
        // Event-Listener für den Ton-An/Aus-Button
        tonAnAusButton.addEventListener('click', () => {
            toggleSound();
        });
    }

    // Event-Listener für den neuen "Mapping bearbeiten"-Button
    if (mappingBearbeitenButton) {
        mappingBearbeitenButton.addEventListener('click', zeigeMappingBearbeiten);
    }

    // Event-Listener für den "Abbrechen"-Button im Bearbeitungsbereich
    if (mappingAbbrechenButton) {
        mappingAbbrechenButton.addEventListener('click', versteckeMappingBearbeiten);
    }

    // Event-Listener für den neuen "Zutaten aus Kochbuch laden"-Button
    if (ladenKochbuchZutatenButton) {
        ladenKochbuchZutatenButton.addEventListener('click', () => {
            const kochbuchZutaten = localStorage.getItem(KOCHBUCH_ZUTATEN_STORAGE_KEY);
            if (kochbuchZutaten) {
                zutatenInput.value = kochbuchZutaten;
                // Optional: Bestätigung für den Benutzer
                alert('Zutaten aus dem Kochbuch geladen!');
            } else {
                alert('Keine Zutaten im Kochbuch-Speicher gefunden. Stelle sicher, dass du im Kochbuch die Zutaten gespeichert hast.');
            }
        });
    }


    function toggleSound() {
        soundEnabled = !soundEnabled;
        tonAnAusButton.textContent = soundEnabled ? 'Hinweissignal Aus' : 'Hinweissignal An';
    }

    // Zeigt die aktuellen Mapping-Felder im Bearbeitungsbereich an
    function zeigeMappingFelder(mapping) {
        mappingFelderDiv.innerHTML = '';
        // Sortiere die Allergien alphabetisch für bessere Übersicht
        const sortierteAllergien = Object.keys(mapping).sort();

        sortierteAllergien.forEach(allergie => {
            const div = document.createElement('div');
            div.classList.add('mapping-item'); // Klasse für Styling
            const label = document.createElement('label');
            label.textContent = `${allergie}: `;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = mapping[allergie].join(', ');
            input.dataset.allergie = allergie; // Speichern des Allergie-Namens (dataset.allergie ist korrekt)
            div.appendChild(label);
            div.appendChild(input);

            // Button zum Entfernen dieser Allergie
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Entfernen';
            removeButton.classList.add('remove-mapping-item');
            removeButton.addEventListener('click', () => {
                // Bestätigungsdialog vor dem Entfernen
                if (confirm(`Möchtest du die Allergie "${allergie}" wirklich entfernen?`)) {
                     delete allergieMapping[allergie]; // Entferne aus dem aktuellen Mapping-Objekt

                    // HINZUGEFÜGT: Speichere das aktualisierte Mapping im Local Storage
                    localStorage.setItem(ALLERGIEN_MAPPING_STORAGE_KEY, JSON.stringify(allergieMapping));

                    zeigeMappingFelder(allergieMapping); // Aktualisiere die Anzeige
                    befuelleAllergieVorschlaege(); // Aktualisiere die Vorschläge
                }
            });
            div.appendChild(removeButton);
            mappingFelderDiv.appendChild(div);
        });
    }

    // Event-Listener für das Hinzufügen einer neuen Allergie zum Bearbeiten
    if (allergieMappingHinzufuegenButton) {
        allergieMappingHinzufuegenButton.addEventListener('click', () => {
            const neueAllergieName = neueAllergieNameInput.value.trim().toLowerCase();
            const neueAllergieBegriffe = neueAllergieBegriffeInput.value.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== '');

            if (neueAllergieName && !allergieMapping.hasOwnProperty(neueAllergieName)) {
                allergieMapping[neueAllergieName] = neueAllergieBegriffe;
                zeigeMappingFelder(allergieMapping); // Aktualisiere die Anzeige mit der neuen Allergie
                befuelleAllergieVorschlaege(); // Aktualisiere die Vorschläge
                neueAllergieNameInput.value = ''; // Felder leeren
                neueAllergieBegriffeInput.value = '';
            } else if (allergieMapping.hasOwnProperty(neueAllergieName)) {
                alert(`Die Allergie "${neueAllergieName}" existiert bereits im Mapping. Du kannst ihre Begriffe oben bearbeiten.`);
            } else {
                alert('Bitte gib einen Namen für die neue Allergie ein.');
            }
        });
    }

    // --- Korrigierter Event-Listener für den "Speichern & Schließen"-Button ---
    if (mappingSpeichernButton) {
        mappingSpeichernButton.addEventListener('click', () => {
            const neueMapping = {};
            // Wählt alle Input-Felder in den Mapping-Items aus
            const inputFelder = mappingFelderDiv.querySelectorAll('.mapping-item input');
            inputFelder.forEach(input => {
                const allergieName = input.dataset.allergie; // KORRIGIERT: Zugriff auf dataset.allergie
                if (allergieName) { // Prüfe, ob allergieName definiert ist, um Fehler zu vermeiden
                    neueMapping[allergieName] = input.value.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== '');
                }
            });
            localStorage.setItem(ALLERGIEN_MAPPING_STORAGE_KEY, JSON.stringify(neueMapping));
            allergieMapping = { ...neueMapping }; // WICHTIG: Aktualisiere das globale allergieMapping-Objekt
            localStorage.setItem(ERSTER_START_STORAGE_KEY, 'false'); // Markiere, dass der erste Start vorbei ist
            versteckeMappingBearbeiten(); // Bearbeitungsbereich ausblenden
            befuelleAllergieVorschlaege(); // Aktualisiere die Vorschläge basierend auf dem neuen Mapping
        });
    }
    // --- Ende der Korrektur ---

    // Befüllt die Vorschläge für die Allergie-Eingabe basierend auf dem aktuellen Mapping
    function befuelleAllergieVorschlaege() {
        allergieVorschlaegeDatalist.innerHTML = ''; // Vorherige Vorschläge leeren
        // Sortiere die Allergien alphabetisch für bessere Übersicht
        const sortierteAllergien = Object.keys(allergieMapping).sort();
        sortierteAllergien.forEach(allergen => {
            const option = document.createElement('option');
            option.value = allergen;
            allergieVorschlaegeDatalist.appendChild(option);
        });
    }

    // Befüllt die Vorschläge für die Zutaten-Eingabe
    function befuelleZutatenVorschlaege() {
        haeufigeZutaten.forEach(zutat => {
            const option = document.createElement('option');
            option.value = zutat;
            zutatenVorschlaegeDatalist.appendChild(option);
        });
    }

    // Rendert die Liste der persönlichen Allergien
    function renderAllergien() {
        allergieListeDiv.innerHTML = '';
        allergien.forEach((allergy, index) => {
            const span = document.createElement('span');
            span.classList.add('allergy-item');
            span.textContent = allergy;

            const loeschButton = document.createElement('span');
            loeschButton.classList.add('loesch-button');
            loeschButton.textContent = ' ×';
            loeschButton.style.cursor = 'pointer';
            loeschButton.style.marginLeft = '5px';
            loeschButton.addEventListener('click', () => {
                allergien.splice(index, 1);
                speichereAllergien();
                renderAllergien();
            });
            span.appendChild(loeschButton);
            allergieListeDiv.appendChild(span);
        });
    }

    // Event-Listener für das Hinzufügen einer persönlichen Allergie
    hinzufuegenAllergieButton.addEventListener('click', () => {
        const ausgewaehlteAllergie = neueAllergieInput.value.trim().toLowerCase();
        // Füge Allergie hinzu, wenn sie nicht leer ist und noch nicht in der Liste ist
        if (ausgewaehlteAllergie && !allergien.includes(ausgewaehlteAllergie)) {
            allergien.push(ausgewaehlteAllergie);
            speichereAllergien();
            renderAllergien();
            neueAllergieInput.value = '';
        } else if (allergien.includes(ausgewaehlteAllergie)) {
             alert(`Die Allergie "${ausgewaehlteAllergie}" wurde bereits zu deiner Liste hinzugefügt.`);
        } else if (ausgewaehlteAllergie === '') {
             alert('Bitte gib eine Allergie ein.');
        }
    });

    // Speichert die persönlichen Allergien im Local Storage
    function speichereAllergien() {
        localStorage.setItem(ALLERGIEN_STORAGE_KEY, JSON.stringify(allergien));
    }

    // Generiert Variationen eines Allergens (Umlaute, ss/ß, Singular/Plural für Nüsse)
    function generiereVariationen(allergen) {
        const variationen = new Set([allergen.toLowerCase()]);
        const lowerAllergen = allergen.toLowerCase();

        const ohneUmlaute = lowerAllergen
            .replace('ü', 'u')
            .replace('ä', 'a')
            .replace('ö', 'o');

        variationen.add(ohneUmlaute);

        if (lowerAllergen.includes('nüsse')) {
            variationen.add(lowerAllergen.replace('nüsse', 'nuss'));
            variationen.add(ohneUmlaute.replace('nusse', 'nuss'));
        } else if (lowerAllergen.includes('nuss')) {
            variationen.add(lowerAllergen.replace('nuss', 'nüsse'));
            variationen.add(ohneUmlaute.replace('nuss', 'nusse'));
        }

        if (lowerAllergen.includes('ss')) {
            variationen.add(lowerAllergen.replace('ss', 'ß'));
        } else if (lowerAllergen.includes('ß')) {
            variationen.add(lowerAllergen.replace('ß', 'ss'));
        }

        return Array.from(variationen);
    }

    // Spielt den Warnton ab (Buzzer-ähnlich)
    function playAlertSound() {
        if (soundEnabled) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext) {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.1);

                gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            }
        }
    }

    // Spielt den Sicherheitston ab
    function playSafeSound() {
        if (soundEnabled) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext) {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(1320, audioContext.currentTime + 0.3);

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        }
    }

    // Event-Listener für den "Zutaten prüfen"-Button
    pruefenButton.addEventListener('click', () => {
        // *** Prüfen, ob persönliche Allergien hinterlegt sind ***
        if (allergien.length === 0) {
            ergebnisBereich.classList.remove('hidden');
            ergebnisBereich.className = ''; // Keine spezifische Klasse
            ergebnisText.textContent = 'Bitte füge zuerst deine Allergien hinzu, um Zutaten zu prüfen.';
            gefundeneAllergeneListe.classList.add('hidden');
            return; // Stoppe die weitere Ausführung der Funktion
        }
        // *** Ende der Prüfung ***

        const zutatenText = zutatenInput.value.toLowerCase();
        const gefundene = new Set();
        // Wörter in der Zutatenliste aufteilen (verbessert)
        const zutatenWoerter = zutatenText.split(/[\s,.;:()"'-]+/).filter(word => word.length > 0);
        const alleZutatenAlsEinString = zutatenText.toLowerCase(); // Auch als gesamter String prüfen für Phrasen

        console.log("Eingegebene Allergien:", allergien);
        console.log("Eingegebene Zutaten (als Wörter):", zutatenWoerter);
        console.log("Eingegebene Zutaten (als String):", alleZutatenAlsEinString);

        // Ergebnisbereich zurücksetzen
        ergebnisBereich.classList.add('hidden');
        gefundeneAllergeneListe.classList.add('hidden');
        gefundeneAllergeneListe.innerHTML = '';

        if (zutatenText) {
            // Prüfe jede persönliche Allergie gegen die Zutatenliste
            allergien.forEach(allergy => {
                const allergyLower = allergy.toLowerCase();
                // Generiere Variationen des Allergie-Namens
                const variationen = generiereVariationen(allergyLower);
                console.log(`Prüfe Allergie: ${allergyLower} (Variationen: ${variationen})`);

                let gefundenInZutaten = false;

                // 1. Überprüfe die eingegebene Allergie und ihre Variationen direkt im Zutaten-String
                for (const variation of variationen) {
                    if (alleZutatenAlsEinString.includes(variation)) {
                        console.log(`  Treffer gefunden (direkte Allergie/Variation) für: ${allergyLower} -> ${variation}`);
                        gefundene.add(allergy);
                        gefundenInZutaten = true;
                        break; // Ein Treffer reicht für diese Allergie
                    }
                }

                // 2. Überprüfe verwandte Begriffe aus dem Mapping (falls vorhanden und noch nicht gefunden)
                if (!gefundenInZutaten && allergieMapping.hasOwnProperty(allergyLower)) {
                    const verwandteBegriffe = allergieMapping[allergyLower];
                    console.log(`  Prüfe verwandte Begriffe für Allergie: ${allergyLower}: ${verwandteBegriffe}`);
                    for (const begriff of verwandteBegriffe) {
                        // Prüfe jeden verwandten Begriff im Zutaten-String
                        if (alleZutatenAlsEinString.includes(begriff)) {
                            console.log(`  Treffer gefunden (verwandter Begriff: ${begriff}) für Allergie: ${allergyLower} -> ${begriff}`);
                            gefundene.add(allergy);
                            gefundenInZutaten = true;
                            break; // Ein Treffer reicht für diese Allergie
                        }
                    }
                }
            });

            // Ergebnis anzeigen
            ergebnisBereich.classList.remove('hidden');

            const gefundeneArray = Array.from(gefundene);

            if (gefundeneArray.length > 0) {
                ergebnisBereich.className = 'unsicher'; // CSS-Klasse für unsicher
                ergebnisText.textContent = 'Vorsicht! Folgende Allergene könnten enthalten sein:';
                playAlertSound(); // Warnton abspielen
                gefundeneAllergeneListe.classList.remove('hidden');
                gefundeneArray.forEach(allergen => {
                    const li = document.createElement('li');
                    li.textContent = allergen;
                    gefundeneAllergeneListe.appendChild(li);
                });
            } else {
                ergebnisBereich.className = 'sicher'; // CSS-Klasse für sicher
                ergebnisText.textContent = 'Sicher! Keine deiner angegebenen Allergien gefunden.';
                gefundeneAllergeneListe.classList.add('hidden'); // Liste ausblenden
                playSafeSound(); // Sicherheitston abspielen
            }
        } else {
            // Wenn keine Zutaten eingegeben wurden
            ergebnisBereich.classList.remove('hidden');
            ergebnisBereich.className = ''; // Keine spezifische Klasse
            ergebnisText.textContent = 'Bitte gib eine Zutatenliste ein.';
            gefundeneAllergeneListe.classList.add('hidden'); // Liste ausblenden
        }
    });

    // Eventlistener für den Notfall-Hinweise-Button
    if (notfallHinweiseButton) {
        notfallHinweiseButton.addEventListener('click', () => {
            window.location.href = 'notfall.html'; // Weiterleitung zur Notfallseite
        });
    }

    // Initialisiere Vorschläge beim Start
    befuelleAllergieVorschlaege();
    befuelleZutatenVorschlaege();
    renderAllergien(); // Rendere die persönlichen Allergien beim Laden
});
