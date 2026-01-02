// Globale Variablen für DOM-Elemente
const startSaldoSection = document.getElementById('initial-saldo-section');
const startSaldoInput = document.getElementById('start-saldo-input');
const startSaldoBtn = document.getElementById('start-saldo-speichern');
const transaktionsForm = document.getElementById('transaktions-formular');
const transaktionsListe = document.getElementById('transaktions-liste');
const saldoBetragAnzeige = document.getElementById('saldo-betrag');
const warnMeldung = document.getElementById('warn-meldung');

const standardTransaktionsForm = document.getElementById('standard-transaktions-formular');
const standardTransaktionsListe = document.getElementById('standard-transaktions-liste');
const monatlicheBuchungBtn = document.getElementById('monatliche-buchung-btn');
const letzteBuchungInfo = document.getElementById('letzte-buchung-info');

const berichtMonatAuswahl = document.getElementById('bericht-monat-auswahl');
const berichtGenerierenBtn = document.getElementById('bericht-generieren-btn');
const berichtsDetails = document.getElementById('berichts-details');

const budgetForm = document.getElementById('budget-formular');
const budgetListe = document.getElementById('budget-liste');
const kategorienDetails = document.getElementById('kategorien-details');
const saldoVerlaufDetails = document.getElementById('saldo-verlauf-details');

// NEUE DOM-ELEMENTE FÜR LOGIN/SPERREN
const sperrbildschirmOverlay = document.getElementById('sperrbildschirm-overlay');
const loginFormular = document.getElementById('login-formular');
const masterPasswortInput = document.getElementById('master-passwort');
const loginFehlerAnzeige = document.getElementById('login-fehler');
const hauptInhalt = document.getElementById('haupt-inhalt');
const setupMessage = document.getElementById('setup-message');


// Speicherung von Transaktionen, Saldo und Budgets
let transaktionen = [];
let standardTransaktionen = [];
let budgets = []; 
let startSaldo = 0;
let letzteBuchungDatum = null;
let KRYPTO_SCHLUESSEL = null; // Speichert den Passwort-Hash

// Kategorien-Liste 
const KATEGORIEN = [
    "Gehalt", "Miete", "Lebensmittel", "Transport", "Freizeit", 
    "Abo", "Versicherungen", "Einkommen-Sonstiges", "Ausgabe-Sonstiges"
];

// SCHWELLENWERTE FÜR WARNUNGEN
const SCHWELLENWERT_NIEDRIG = 500;
const SCHWELLENWERT_KRITISCH = 100;

// --- HILFSFUNKTIONEN FÜR SICHERHEIT ---

// Generierung eines einfachen Hashes (zum Passwort-Vergleich)
function passwortZuHash(passwort) {
    let hash = 0;
    if (passwort.length === 0) return hash;
    for (let i = 0; i < passwort.length; i++) {
        const char = passwort.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    return hash.toString();
}

// Codierung der Daten (Base64)
function kodierteDaten(datenObjekt) {
    const jsonString = JSON.stringify(datenObjekt);
    return btoa(jsonString); 
}

// Decodierung der Daten (Base64)
function decodiereDaten(kodierterString) {
    if (!kodierterString) return null;
    try {
        const jsonString = atob(kodierterString); 
        return JSON.parse(jsonString);
    } catch (e) {
        // Fehler bei Decodierung (z.B. falsches Passwort oder manipulierte Daten)
        return null; 
    }
}

// --- DATENVERWALTUNG (ANGEPASST) ---

function ladeDaten(passwort) {
    const gespeicherterHash = localStorage.getItem('finanzTracker_hash');
    const gespeicherteDaten = localStorage.getItem('finanzTracker_data');
    
    // 1. Ersteinrichtung, keine Daten gespeichert
    if (!gespeicherterHash && !gespeicherteDaten) {
        return; 
    }

    // 2. Prüfe Passwort gegen gespeicherten Hash
    const eingegebenerHash = passwortZuHash(passwort);

    if (eingegebenerHash !== gespeicherterHash) {
        loginFehlerAnzeige.textContent = "Falsches Master-Passwort.";
        loginFehlerAnzeige.style.display = 'block';
        return false;
    }

    // 3. Entschlüssele Daten
    const datenObjekt = decodiereDaten(gespeicherteDaten);

    if (datenObjekt) {
        // Daten erfolgreich geladen und entschlüsselt
        transaktionen = datenObjekt.transaktionen || [];
        standardTransaktionen = datenObjekt.standardTransaktionen || [];
        budgets = datenObjekt.budgets || [];
        // Sicherstellen, dass startSaldo immer eine Zahl ist
        startSaldo = parseFloat(datenObjekt.startSaldo) || 0; 
        letzteBuchungDatum = datenObjekt.letzteBuchungDatum;

        KRYPTO_SCHLUESSEL = eingegebenerHash; // Setze den gültigen Schlüssel
        
        // Entsperre die Anwendung
        entsperreAnwendung();
        return true;
    } else {
        loginFehlerAnzeige.textContent = "Fehler beim Entschlüsseln der Daten. Prüfen Sie das Passwort.";
        loginFehlerAnzeige.style.display = 'block';
        return false;
    }
}

function speichereDaten() {
    if (!KRYPTO_SCHLUESSEL) return; 
    
    const datenObjekt = {
        transaktionen,
        standardTransaktionen,
        budgets,
        startSaldo: startSaldo.toFixed(2),
        letzteBuchungDatum
    };

    // 1. Hash speichern
    localStorage.setItem('finanzTracker_hash', KRYPTO_SCHLUESSEL);
    
    // 2. Daten kodieren und speichern
    const kodierteString = kodierteDaten(datenObjekt);
    localStorage.setItem('finanzTracker_data', kodierteString);
}


// --- LOGIN-FUNKTIONEN ---

function initSperrbildschirm() {
    const gespeicherterHash = localStorage.getItem('finanzTracker_hash');
    
    if (gespeicherterHash) {
        setupMessage.innerHTML = '<p>Bitte geben Sie Ihr Master-Passwort ein, um fortzufahren.</p>';
        document.getElementById('login-button').textContent = "Entsperren";
    } else {
        setupMessage.innerHTML = '<p>Bitte legen Sie Ihr **Master-Passwort** fest (mind. 6 Zeichen).</p>';
        document.getElementById('login-button').textContent = "Festlegen und Speichern";
    }

    hauptInhalt.style.display = 'none';
    sperrbildschirmOverlay.style.display = 'flex';
}

function entsperreAnwendung() {
    sperrbildschirmOverlay.style.display = 'none';
    hauptInhalt.style.display = 'grid'; 
    
    // Initialisiere die UI, nachdem die Daten geladen wurden
    renderUI();
}

function handleLogin(event) {
    event.preventDefault();
    loginFehlerAnzeige.style.display = 'none';
    const passwort = masterPasswortInput.value;
    
    if (passwort.length < 6) {
        loginFehlerAnzeige.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
        loginFehlerAnzeige.style.display = 'block';
        return;
    }

    const gespeicherterHash = localStorage.getItem('finanzTracker_hash');
    
    if (!gespeicherterHash) {
        // ERSTEINRICHTUNG
        KRYPTO_SCHLUESSEL = passwortZuHash(passwort);
        speichereDaten(); 
        entsperreAnwendung();
        alert("Master-Passwort erfolgreich eingerichtet! Der Start-Saldo ist 0.00€.");
    } else {
        // REGULÄRER LOGIN
        ladeDaten(passwort);
    }
}

// Funktion zum Initialisieren der UI-Elemente nach erfolgreichem Login
function renderUI() {
    // Stellt den Startsaldo-Bereich richtig dar
    if (startSaldo === 0 && !localStorage.getItem('finanzTracker_startSaldo')) {
        startSaldoSection.style.display = 'block';
    } else {
        startSaldoSection.style.display = 'none';
    }

    initKategorienDropdowns();
    renderTransaktionen();
    renderStandardTransaktionen();
    initBerichtsAuswahl();
    renderBudgetDashboard(); 
}

// --- RESTLICHE ANWENDUNGSFUNKTIONEN (UNVERÄNDERT ZUR VORHERIGEN VERSION) ---

function berechneUndZeigeSaldo() {
    let gesamtSaldo = startSaldo;

    gesamtSaldo += transaktionen.reduce((summe, transaktion) => {
        return summe + transaktion.betrag;
    }, 0);

    const formatierterSaldo = gesamtSaldo.toFixed(2);
    
    saldoBetragAnzeige.textContent = formatierterSaldo + ' €';
    
    const saldoAnzeigeDiv = document.getElementById('saldo-anzeige');
    saldoAnzeigeDiv.classList.remove('positiv', 'negativ');
    
    if (gesamtSaldo >= 0) {
        saldoAnzeigeDiv.classList.add('positiv');
    } else {
        saldoAnzeigeDiv.classList.add('negativ');
    }

    pruefeWarnung(gesamtSaldo);
}

function pruefeWarnung(aktuellerSaldo) {
    warnMeldung.style.display = 'none';
    warnMeldung.className = 'warnung'; 

    if (aktuellerSaldo < 0) {
        warnMeldung.textContent = "AKUTE GEFAHR! Ihr Kontostand ist negativ. SOFORT handeln!";
        warnMeldung.classList.add('warnung-akut'); 
        warnMeldung.style.display = 'block';
    } else if (aktuellerSaldo <= SCHWELLENWERT_KRITISCH) {
        warnMeldung.textContent = `KRITISCH! Saldo unter ${SCHWELLENWERT_KRITISCH.toFixed(2)} €. Liquidität prüfen!`;
        warnMeldung.classList.add('warnung-kritisch'); 
        warnMeldung.style.display = 'block';
    } else if (aktuellerSaldo <= SCHWELLENWERT_NIEDRIG) {
        warnMeldung.textContent = `Hinweis: Saldo unter ${SCHWELLENWERT_NIEDRIG.toFixed(2)} €. Budget im Auge behalten.`;
        warnMeldung.classList.add('warnung-niedrig'); 
        warnMeldung.style.display = 'block';
    } 
}

function initKategorienDropdowns() {
    const dropdowns = [
        document.getElementById('kategorie'), 
        document.getElementById('standard-kategorie'), 
        document.getElementById('budget-kategorie')
    ];

    dropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Kategorie wählen</option>';
            KATEGORIEN.forEach(kat => {
                const option = document.createElement('option');
                option.value = kat;
                option.textContent = kat;
                dropdown.appendChild(option);
            });
        }
    });
}

function renderTransaktionen() {
    transaktionsListe.innerHTML = ''; 
    
    const sortierteTransaktionen = [...transaktionen]
        .sort((a, b) => new Date(b.datum) - new Date(a.datum)); 

    sortierteTransaktionen.forEach((transaktion, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('transaktion-item');
        
        // Korrekte Index-Findung für das Löschen
        const originalIndex = transaktionen.findIndex(t => 
            t.beschreibung === transaktion.beschreibung && 
            t.datum === transaktion.datum && 
            t.betrag === transaktion.betrag
        );

        const betragKlasse = transaktion.typ === 'einnahme' ? 'einnahme' : 'ausgabe';
        const betragAnzeige = (transaktion.typ === 'ausgabe' ? '' : '+') + Math.abs(transaktion.betrag).toFixed(2) + ' €';
        const kategorieAnzeige = transaktion.kategorie ? ` | Kat.: ${transaktion.kategorie}` : '';

        listItem.innerHTML = `
            <div>
                <strong>${transaktion.beschreibung}</strong>
                <small> (${new Date(transaktion.datum).toLocaleDateString('de-DE')}) ${kategorieAnzeige}</small>
            </div>
            <div class="transaktion-betrag ${betragKlasse}">
                ${betragAnzeige}
            </div>
            <button class="delete-btn" data-index="${index}">Löschen</button>
        `; 

        transaktionsListe.appendChild(listItem);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.currentTarget.dataset.index);
            loescheTransaktion(indexToRemove);
        });
    });

    berechneUndZeigeSaldo();
    initBerichtsAuswahl();
    renderBudgetDashboard(); 
}

function renderStandardTransaktionen() {
    standardTransaktionsListe.innerHTML = '';
    
    standardTransaktionen.forEach((standard, index) => {
        const listItem = document.createElement('li');
        listItem.dataset.index = index; 
        
        const typKlasse = standard.typ === 'einnahme' ? 'einnahme' : 'ausgabe';
        const vorzeichen = standard.typ === 'ausgabe' ? '-' : '+';
        const betragAnzeige = vorzeichen + standard.betrag.toFixed(2) + ' €';
        const kategorieAnzeige = standard.kategorie ? ` | Kat.: ${standard.kategorie}` : '';

        listItem.innerHTML = `
            <div>
                <strong>${standard.beschreibung}</strong>
                <small> ${kategorieAnzeige}</small>
            </div>
            <div class="transaktion-betrag ${typKlasse} standard-betrag-info">
                ${betragAnzeige}
            </div>
            <button class="delete-standard-btn" data-index="${index}">Entfernen</button>
        `;
        standardTransaktionsListe.appendChild(listItem);
    });

    document.querySelectorAll('.delete-standard-btn').forEach(button => {
        button.addEventListener('click', loescheStandardTransaktion);
    });
}

function handleBudgetSpeichern(event) {
    event.preventDefault();
    
    const kategorie = document.getElementById('budget-kategorie').value;
    const betragStr = document.getElementById('budget-betrag').value;
    const betrag = parseFloat(betragStr);

    if (isNaN(betrag) || kategorie === '') {
        alert("Bitte Kategorie und Budget-Betrag korrekt eingeben.");
        return;
    }

    const existingIndex = budgets.findIndex(b => b.kategorie === kategorie);
    const neuesBudget = { kategorie, limit: betrag };

    if (existingIndex > -1) {
        budgets[existingIndex] = neuesBudget;
        alert(`Budget für ${kategorie} wurde auf ${betrag.toFixed(2)} € aktualisiert.`);
    } else {
        budgets.push(neuesBudget);
        alert(`Budget für ${kategorie} wurde auf ${betrag.toFixed(2)} € hinzugefügt.`);
    }

    speichereDaten();
    renderBudgetDashboard();
    budgetForm.reset();
}

function berechneBudgetFortschritt() {
    const heute = new Date().toISOString().substring(0, 7); 
    
    const aktuelleAusgaben = transaktionen
        .filter(t => t.datum.startsWith(heute) && t.typ === 'ausgabe')
        .reduce((acc, t) => {
            const kat = t.kategorie || 'Ausgabe-Sonstiges';
            acc[kat] = (acc[kat] || 0) + Math.abs(t.betrag);
            return acc;
        }, {});

    const fortschritte = budgets.map(budget => {
        const ausgegeben = aktuelleAusgaben[budget.kategorie] || 0;
        const limit = budget.limit;
        const prozent = (ausgegeben / limit) * 100;
        let status = 'im-limit';
        if (prozent >= 100) {
            status = 'ueberschritten';
        } else if (prozent >= 80) {
            status = 'kritisch';
        }

        return {
            kategorie: budget.kategorie,
            ausgegeben: ausgegeben,
            limit: limit,
            prozent: Math.min(prozent, 100), 
            ueber_limit: ausgegeben > limit,
            status: status
        };
    });

    return fortschritte;
}

function renderBudgetDashboard() {
    budgetListe.innerHTML = '';

    if (budgets.length === 0) {
        budgetListe.innerHTML = '<p>Bisher wurden keine Budgets festgelegt.</p>';
        return;
    }

    const fortschritte = berechneBudgetFortschritt();
    const aktuellerMonat = new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' });

    fortschritte.forEach(f => {
        const listItem = document.createElement('li');
        listItem.classList.add('budget-item');
        
        listItem.innerHTML = `
            <div class="budget-header">
                <strong>${f.kategorie}</strong>
                <span class="budget-betraege">${f.ausgegeben.toFixed(2)} € / ${f.limit.toFixed(2)} €</span>
            </div>
            <div class="budget-balken-container">
                <div class="budget-balken budget-${f.status}" style="width: ${f.prozent}%"></div>
            </div>
            <small class="budget-status-text">
                ${f.ueber_limit 
                    ? `❌ ${aktuellerMonat}: Budget um ${(f.ausgegeben - f.limit).toFixed(2)} € überschritten!`
                    : (f.prozent >= 80 ? `⚠️ ${aktuellerMonat}: ${f.prozent.toFixed(0)}% des Budgets verbraucht.` : `✅ ${aktuellerMonat}: ${f.prozent.toFixed(0)}% verbraucht.`)
                }
            </small>
            <button class="delete-budget-btn" data-kategorie="${f.kategorie}">Löschen</button>
        `;
        budgetListe.appendChild(listItem);
    });
    
    document.querySelectorAll('.delete-budget-btn').forEach(button => {
        button.addEventListener('click', loescheBudget);
    });
}

function loescheBudget(event) {
    const kategorie = event.target.dataset.kategorie;
    if (confirm(`Soll das Budget für ${kategorie} wirklich gelöscht werden?`)) {
        budgets = budgets.filter(b => b.kategorie !== kategorie);
        speichereDaten();
        renderBudgetDashboard();
    }
}

function handleStartSaldoSpeichern() {
    const inputWert = parseFloat(startSaldoInput.value);
    if (!isNaN(inputWert)) {
        startSaldo = inputWert;
        // Aktualisiert den Start-Saldo im LocalStorage
        // und setzt den Zustand der Anwendung
        speichereDaten();
        startSaldoSection.style.display = 'none';
        berechneUndZeigeSaldo();
    } else {
        alert("Bitte geben Sie einen gültigen Startkontostand ein.");
    }
}

function handleTransaktionHinzufuegen(event) {
    event.preventDefault(); 
    
    if (startSaldoSection.style.display !== 'none' && startSaldo === 0) {
        alert("Bitte speichern Sie zuerst Ihren Startkontostand!");
        return;
    }

    const beschreibung = document.getElementById('beschreibung').value;
    const betragStr = document.getElementById('betrag').value;
    const typ = document.getElementById('art').value;
    const datum = document.getElementById('datum').value;
    const kategorie = document.getElementById('kategorie').value; 

    let betrag = parseFloat(betragStr);
    
    if (isNaN(betrag) || typ === '' || kategorie === '') {
        alert("Bitte alle Felder korrekt ausfüllen und eine Kategorie wählen.");
        return;
    }

    if (typ === 'ausgabe') {
        betrag = -Math.abs(betrag); 
    } else {
        betrag = Math.abs(betrag);
    }
    
    const neueTransaktion = {
        beschreibung,
        betrag: betrag,
        typ,
        datum,
        kategorie 
    };

    transaktionen.push(neueTransaktion);
    speichereDaten();
    renderTransaktionen();
    transaktionsForm.reset();
}

function loescheTransaktion(index) {
    if (confirm("Soll diese Transaktion wirklich gelöscht werden?")) {
        transaktionen.splice(index, 1);
        speichereDaten();
        renderTransaktionen();
    }
}

function handleStandardHinzufuegen(event) {
    event.preventDefault();
    
    const beschreibung = document.getElementById('standard-beschreibung').value;
    const betragStr = document.getElementById('standard-betrag').value;
    const typ = document.getElementById('standard-art').value;
    const kategorie = document.getElementById('standard-kategorie').value; 

    const betrag = parseFloat(betragStr);
    
    if (isNaN(betrag) || typ === '' || kategorie === '') {
        alert("Bitte alle Felder korrekt ausfüllen und eine Kategorie wählen.");
        return;
    }

    const neuerStandard = {
        beschreibung,
        betrag: Math.abs(betrag), 
        typ,
        kategorie 
    };

    const existingIndex = standardTransaktionen.findIndex(t => t.beschreibung.toLowerCase() === beschreibung.toLowerCase());

    if (existingIndex > -1) {
        standardTransaktionen[existingIndex] = neuerStandard; 
        alert(`Standardzahlung "${beschreibung}" wurde aktualisiert.`);
    } else {
        standardTransaktionen.push(neuerStandard); 
        alert(`Standardzahlung "${beschreibung}" wurde hinzugefügt.`);
    }

    speichereDaten();
    renderStandardTransaktionen();
    standardTransaktionsForm.reset();
}

function loescheStandardTransaktion(event) {
    const index = parseInt(event.target.dataset.index);
    if (confirm("Soll diese Standardzahlung wirklich entfernt werden?")) {
        standardTransaktionen.splice(index, 1);
        speichereDaten();
        renderStandardTransaktionen();
    }
}

function fuehreMonatlicheBuchungAus() {
    const heute = new Date();
    const heuteStr = heute.toLocaleDateString('de-DE'); 
    const heuteISO = heute.toISOString().split('T')[0]; 

    if (standardTransaktionen.length === 0) {
        alert("Es sind keine Standardzahlungen hinterlegt.");
        return;
    }

    if (!confirm(`ACHTUNG: Alle ${standardTransaktionen.length} Standardzahlungen werden jetzt für den ${heuteStr} gebucht. Fortfahren?`)) {
        return;
    }

    // Buche JEDE Standardtransaktion
    standardTransaktionen.forEach(standard => {
        let betrag = standard.betrag;
        
        if (standard.typ === 'ausgabe') {
            betrag = -betrag;
        }

        const neueTransaktion = {
            beschreibung: standard.beschreibung + ' (Standardbuchung)',
            betrag: betrag,
            typ: standard.typ,
            datum: heuteISO,
            kategorie: standard.kategorie 
        };
        
        transaktionen.push(neueTransaktion);
    });

    letzteBuchungDatum = heuteStr; 
    letzteBuchungInfo.textContent = `Letzte Buchung: ${letzteBuchungDatum}`;

    speichereDaten();
    renderTransaktionen();
    alert(`Manuelle Buchung erfolgreich! Es wurden ${standardTransaktionen.length} Transaktionen hinzugefügt.`);
}

function initBerichtsAuswahl() {
    berichtMonatAuswahl.innerHTML = '<option value="" disabled selected>Monat auswählen</option>';
    
    const monate = new Set();
    
    transaktionen.forEach(t => {
        const [jahr, monat] = t.datum.split('-');
        monate.add(`${jahr}-${monat}`);
    });

    const sortierteMonate = Array.from(monate).sort().reverse(); 

    sortierteMonate.forEach(monatJahr => {
        const [jahr, monat] = monatJahr.split('-');
        const monatsName = new Date(jahr, monat - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = monatJahr;
        option.textContent = monatsName;
        berichtMonatAuswahl.appendChild(option);
    });
}

function generiereMonatsbericht() {
    const ausgewaehlterMonatJahr = berichtMonatAuswahl.value;
    if (!ausgewaehlterMonatJahr) {
        berichtsDetails.innerHTML = '<p style="color:red;">Bitte wählen Sie zuerst einen Monat aus.</p>';
        kategorienDetails.innerHTML = '';
        saldoVerlaufDetails.innerHTML = '';
        return;
    }

    const monatsTransaktionen = transaktionen.filter(t => t.datum.startsWith(ausgewaehlterMonatJahr));

    if (monatsTransaktionen.length === 0) {
        berichtsDetails.innerHTML = '<p>Keine Transaktionen in diesem Monat gefunden.</p>';
        kategorienDetails.innerHTML = '';
        saldoVerlaufDetails.innerHTML = '';
        return;
    }

    let gesamtEinnahmen = 0;
    let gesamtAusgaben = 0;
    const ausgabenProKategorie = {}; 

    monatsTransaktionen.forEach(t => {
        if (t.typ === 'einnahme') {
            gesamtEinnahmen += t.betrag;
        } else {
            gesamtAusgaben += t.betrag; 
            const kat = t.kategorie || 'Ausgabe-Sonstiges';
            ausgabenProKategorie[kat] = (ausgabenProKategorie[kat] || 0) + Math.abs(t.betrag);
        }
    });

    const monatsSaldo = gesamtEinnahmen + gesamtAusgaben; 

    berichtsDetails.innerHTML = `
        <h4>Analyse für ${berichtMonatAuswahl.options[berichtMonatAuswahl.selectedIndex].text}</h4>
        <p><strong>Gesamt-Einnahmen:</strong> <span class="transaktion-betrag einnahme">${gesamtEinnahmen.toFixed(2)} €</span></p>
        <p><strong>Gesamt-Ausgaben:</strong> <span class="transaktion-betrag ausgabe">${Math.abs(gesamtAusgaben).toFixed(2)} €</span></p>
        <hr>
        <p><strong>Monatlicher Saldo:</strong> <span class="transaktion-betrag ${monatsSaldo >= 0 ? 'einnahme' : 'ausgabe'}">${monatsSaldo.toFixed(2)} €</span></p>
    `;

    renderKategorienDiagramm(ausgabenProKategorie, Math.abs(gesamtAusgaben));
    renderSaldoVerlauf(ausgewaehlterMonatJahr);
}

function renderKategorienDiagramm(ausgabenProKategorie, gesamtAusgaben) {
    if (gesamtAusgaben === 0) {
        kategorienDetails.innerHTML = '<h4>Ausgabenverteilung</h4><p>Keine Ausgaben im ausgewählten Monat.</p>';
        return;
    }

    kategorienDetails.innerHTML = '<h4>Ausgabenverteilung (nach Kategorie)</h4>';
    const totalAusgaben = Math.abs(gesamtAusgaben);

    const sortierteKategorien = Object.entries(ausgabenProKategorie)
        .sort(([, betragA], [, betragB]) => betragB - betragA);

    const diagrammList = document.createElement('ul');
    diagrammList.className = 'kategorien-diagramm-list';

    sortierteKategorien.forEach(([kategorie, betrag]) => {
        const prozent = (betrag / totalAusgaben) * 100;
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div>
                <span class="diagramm-kategorie-name">${kategorie}</span>
                <span class="diagramm-kategorie-wert">${betrag.toFixed(2)} € (${prozent.toFixed(1)}%)</span>
            </div>
            <div class="diagramm-balken-container">
                <div class="diagramm-balken" style="width: ${prozent}%"></div>
            </div>
        `;
        diagrammList.appendChild(listItem);
    });

    kategorienDetails.appendChild(diagrammList);
}

function renderSaldoVerlauf(aktuellerMonatJahr) {
    saldoVerlaufDetails.innerHTML = '<h4>Saldo-Verlauf über Zeit</h4>';
    
    const sortierteTransaktionen = [...transaktionen].sort((a, b) => new Date(a.datum) - new Date(b.datum));
    let laufenderSaldo = startSaldo;
    const saldoVerlaufPunkte = [
        { datum: 'Start', saldo: startSaldo }
    ];

    sortierteTransaktionen.forEach(t => {
        laufenderSaldo += t.betrag;
        saldoVerlaufPunkte.push({
            datum: t.datum,
            saldo: laufenderSaldo
        });
    });

    const monateImVerlauf = 6; 
    const monatsDaten = {}; 
    
    saldoVerlaufPunkte.forEach(p => {
        if (p.datum !== 'Start') {
            const monat = p.datum.substring(0, 7); 
            monatsDaten[monat] = p.saldo;
        }
    });

    const monateKeys = Object.keys(monatsDaten).sort().slice(-monateImVerlauf);

    if (monateKeys.length < 2) {
        saldoVerlaufDetails.innerHTML += '<p>Zu wenig Daten, um einen Verlauf darzustellen (mindestens 2 Monate erforderlich).</p>';
        return;
    }

    const saldenWerte = monateKeys.map(key => monatsDaten[key]);
    const maxSaldo = Math.max(...saldenWerte, 0);
    const minSaldo = Math.min(...saldenWerte, 0);
    const range = maxSaldo - minSaldo;
    const nullLinieProzent = range > 0 ? (maxSaldo / range) * 100 : 50;

    const chartContainer = document.createElement('div');
    chartContainer.classList.add('verlauf-container');
    chartContainer.style.position = 'relative';

    const nullLinie = document.createElement('div');
    nullLinie.classList.add('null-linie');
    nullLinie.style.bottom = `${nullLinieProzent}%`;
    chartContainer.appendChild(nullLinie);

    monateKeys.forEach((monat, index) => {
        const saldo = monatsDaten[monat];
        const hoeheProzent = range > 0 ? (Math.abs(saldo - minSaldo) / range) * 100 : 0;
        const istPositiv = saldo >= 0;
        
        const punkt = document.createElement('div');
        punkt.classList.add('verlauf-punkt', istPositiv ? 'positiv' : 'negativ');
        
        let balkenHoehe = 0;
        let balkenBottom = 0;

        if (istPositiv) {
            balkenHoehe = hoeheProzent - nullLinieProzent;
            balkenBottom = nullLinieProzent;
        } else {
            balkenHoehe = nullLinieProzent - hoeheProzent;
            balkenBottom = hoeheProzent;
        }

        punkt.style.bottom = `${balkenBottom}%`;
        punkt.style.height = `${balkenHoehe}%`;
        
        punkt.style.left = `${(index / (monateKeys.length - 1)) * 100}%`;
        
        punkt.title = `${new Date(monat + '-01').toLocaleString('de-DE', { month: 'short', year: 'numeric' })}: ${saldo.toFixed(2)} €`;

        chartContainer.appendChild(punkt);
    });

    const beschriftungDiv = document.createElement('div');
    beschriftungDiv.classList.add('verlauf-beschriftung');
    monateKeys.forEach(monat => {
        const label = document.createElement('span');
        label.textContent = new Date(monat + '-01').toLocaleString('de-DE', { month: 'short' });
        beschriftungDiv.appendChild(label);
    });
    
    saldoVerlaufDetails.appendChild(chartContainer);
    saldoVerlaufDetails.appendChild(beschriftungDiv);
}


// --- INITIALISIERUNG ---

// Events hinzufügen
startSaldoBtn.addEventListener('click', handleStartSaldoSpeichern);
transaktionsForm.addEventListener('submit', handleTransaktionHinzufuegen);
standardTransaktionsForm.addEventListener('submit', handleStandardHinzufuegen);
monatlicheBuchungBtn.addEventListener('click', fuehreMonatlicheBuchungAus);
berichtGenerierenBtn.addEventListener('click', generiereMonatsbericht);
budgetForm.addEventListener('submit', handleBudgetSpeichern); 
loginFormular.addEventListener('submit', handleLogin); 

// Beim Laden der Seite
window.addEventListener('DOMContentLoaded', () => {
    initSperrbildschirm(); 
});

