// --- Globale Daten und Speicherung ---
let medications = JSON.parse(localStorage.getItem('medications')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];
let doctorData = JSON.parse(localStorage.getItem('doctorData')) || { name: '', email: '', userInfo: '' };

let currentReminderMedication = null;
let currentPrescriptionMedication = null; 
let currentSideEffectMedication = null; 
let currentQuestionMedication = null; 
let currentCalendarDate = new Date();

// --- DOM-Elemente abrufen ---
const medForm = document.getElementById('med-form');
const popup = document.getElementById('popup-reminder');
const popupText = document.getElementById('popup-text');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearSpan = document.getElementById('current-month-year');
const dailyScheduleList = document.getElementById('daily-schedule-list');
const selectedDateInfo = document.getElementById('selected-date-info');
const historyList = document.getElementById('history-list');
const frequencySelect = document.getElementById('intake-frequency');
const frequencyDetailsDiv = document.getElementById('frequency-details');

const prescriptionModal = document.getElementById('prescription-modal');
const sideEffectModal = document.getElementById('side-effect-modal'); 
const questionModal = document.getElementById('question-modal'); 

// --- Speichern der Daten ---
function saveData() {
    localStorage.setItem('medications', JSON.stringify(medications));
    localStorage.setItem('history', JSON.stringify(history));
    localStorage.setItem('doctorData', JSON.stringify(doctorData));
    updateDoctorDataInputs(); 
}

// --- Hilfsfunktionen für Datum ---
function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// --- Dynamische Steuerung der Frequenz-Eingabe ---
function updateFrequencyFields() {
    const selectedFrequency = frequencySelect.value;
    frequencyDetailsDiv.innerHTML = '';

    let html = '';
    
    if (selectedFrequency === 'daily') {
        html = '<label for="time">Uhrzeit:</label><input type="time" id="time" required>';
    } else if (selectedFrequency === 'weekly') {
        html = '<label for="weekday">Wochentag:</label>' +
               '<select id="weekday" required>' +
               '<option value="1">Montag</option><option value="2">Dienstag</option>' +
               '<option value="3">Mittwoch</option><option value="4">Donnerstag</option>' +
               '<option value="5">Freitag</option><option value="6">Samstag</option>' +
               '<option value="0">Sonntag</option>' +
               '</select>' +
               '<label for="time">Uhrzeit:</label><input type="time" id="time" required>';
    } else if (selectedFrequency === 'monthly') {
        html = '<label for="month-day">Tag im Monat (1-31):</label>' +
               '<input type="number" id="month-day" min="1" max="31" required>' +
               '<label for="time">Uhrzeit:</label><input type="time" id="time" required>';
    }
    
    frequencyDetailsDiv.innerHTML = html;
}
frequencySelect.addEventListener('change', updateFrequencyFields);

// --- 1. Medikament hinzufügen und Vorrat eintragen ---
medForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const frequencyType = document.getElementById('intake-frequency').value;
    
    let frequencyDetail = {};
    if (frequencyType === 'daily') {
        frequencyDetail.time = document.getElementById('time').value;
    } else if (frequencyType === 'weekly') {
        frequencyDetail.weekday = parseInt(document.getElementById('weekday').value); 
        frequencyDetail.time = document.getElementById('time').value;
    } else if (frequencyType === 'monthly') {
        frequencyDetail.monthDay = parseInt(document.getElementById('month-day').value); 
        frequencyDetail.time = document.getElementById('time').value;
    }

    const newMedication = {
        id: Date.now(), 
        name: document.getElementById('name').value,
        stock: parseInt(document.getElementById('stock').value),
        dosage: parseInt(document.getElementById('dosage').value),
        frequencyType: frequencyType, 
        frequencyDetail: frequencyDetail, 
        expiryDate: document.getElementById('expiry-date').value, // Ablaufdatum
        notes: document.getElementById('notes').value,
    };

    medications.push(newMedication);
    saveData();
    renderMedicationList();
    renderCalendar(currentCalendarDate);
    this.reset();
    updateFrequencyFields(); 
});

// --- 2. Bestand reduzieren & Historie speichern ---
function takeMedication(medId) {
    const medIndex = medications.findIndex(m => m.id === medId);
    if (medIndex === -1) return;

    const med = medications[medIndex];
    if (med.stock >= med.dosage) {
        med.stock -= med.dosage;

        const historyEntry = {
            id: Date.now(),
            medName: med.name,
            time: new Date().toISOString(),
            action: 'Eingenommen',
            dosageUsed: med.dosage,
            sideEffect: null
        };
        history.unshift(historyEntry);

        saveData();
        renderMedicationList();
        renderHistory();
        hideReminderPopup();
        renderDailySchedule(formatDate(new Date())); 
    } else {
        alert(`Achtung: Nicht genügend Vorrat von ${med.name} (${med.stock} Stück). Bitte nachfüllen.`);
    }
}

// Bestand manuell nachfüllen
function promptRefill(medId) {
    const amount = prompt("Wie viele Einheiten wurden nachgefüllt?");
    const refillAmount = parseInt(amount);

    if (refillAmount > 0) {
        const med = medications.find(m => m.id === medId);
        if (med) {
            med.stock += refillAmount;
            saveData();
            renderMedicationList();
        }
    } else if (amount !== null) {
        alert("Ungültige Menge eingegeben.");
    }
}

// Löscht ein Medikament
function deleteMedication(medId) {
    if (confirm("Sind Sie sicher, dass Sie dieses Medikament dauerhaft löschen möchten?")) {
        medications = medications.filter(med => med.id !== medId);
        saveData();
        renderMedicationList();
        renderCalendar(currentCalendarDate);
    }
}

// --- 3. Rendering der Medikamentenliste (mit Arzt-Anfragen & separatem Löschen) ---
function renderMedicationList() {
    const list = document.getElementById('med-list');
    list.innerHTML = '';
    const today = new Date();
    
    medications.forEach(med => {
        const li = document.createElement('li');
        
        // 1. Bestandswarnung (unverändert)
        const stockStatus = med.stock <= (med.dosage * 3) ? 'style="color: red; font-weight: bold;"' : '';
        
        // 2. Ablaufdatumswarnung (unverändert)
        let expiryText = `Ablaufdatum: ${med.expiryDate || 'Nicht festgelegt'}`;
        let expiryStatus = '';
        if (med.expiryDate) {
            const medDate = new Date(med.expiryDate + '-01');
            const threeMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 3, 1);

            if (medDate.getTime() < today.getTime()) {
                expiryStatus = 'style="color: darkred; font-weight: bold; background-color: #fdd;"';
                expiryText = `ACHTUNG! Abgelaufen seit ${med.expiryDate}`;
            } else if (medDate.getTime() < threeMonthsFromNow.getTime()) {
                expiryStatus = 'style="color: orange; font-weight: bold;"';
                expiryText = `Bald abgelaufen (${med.expiryDate})`;
            }
        }
        
        // 3. Frequenz Text (unverändert)
        let frequencyText = med.frequencyType.charAt(0).toUpperCase() + med.frequencyType.slice(1);
        const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        if (med.frequencyType === 'weekly') {
            frequencyText += ` (${days[med.frequencyDetail.weekday]})`;
        } else if (med.frequencyType === 'monthly') {
            frequencyText += ` (Tag ${med.frequencyDetail.monthDay})`;
        }
        
        li.innerHTML = `
            <strong>${med.name}</strong> (Dosierung: ${med.dosage} Stk.)<br>
            <span ${stockStatus}>Vorrat: **${med.stock}** Stück.</span> 
            <span ${expiryStatus}>| ${expiryText}</span><br> 
            Einnahme: ${frequencyText} um ${med.frequencyDetail.time}.<br>
            Hinweise: *${med.notes || 'Keine'}*
            
            <div class="med-actions">
                <button onclick="takeMedication(${med.id})" class="action-btn">💊 Einnehmen (${med.dosage} Stk.)</button>
                <button onclick="promptRefill(${med.id})" class="action-btn">📦 Nachfüllen</button>
                
                <div class="dropdown">
                    <button class="dropbtn info-btn" onclick="toggleDropdown(${med.id})">
                        📞 Arzt-Anfragen
                    </button>
                    <div id="dropdown-${med.id}" class="dropdown-content">
                        <a href="#" onclick="requestPrescription(${med.id}); return false;">📄 Rezept anfordern</a>
                        <a href="#" onclick="reportSideEffect(${med.id}); return false;">🚨 Nebenwirkung melden</a>
                        <a href="#" onclick="askDoctorQuestion(${med.id}); return false;">❓ Frage an Arzt</a>
                    </div>
                </div>

                <button onclick="deleteMedication(${med.id})" class="delete-btn">🗑️ Löschen</button>
            </div>
        `;
        list.appendChild(li);
    });
}


// --- NEU: Dropdown-Steuerung für Arzt-Anfragen ---
function toggleDropdown(medId) {
    const dropdown = document.getElementById(`dropdown-${medId}`);
    // Schließe alle anderen offenen Dropdowns
    document.querySelectorAll('.dropdown-content').forEach(content => {
        if (content.id !== `dropdown-${medId}`) {
            content.classList.remove('show');
        }
    });
    // Öffne oder schließe das aktuelle Dropdown
    dropdown.classList.toggle('show');
}

// Schließe das Dropdown, wenn der Benutzer außerhalb klickt
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(openDropdown => {
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        });
    }
}


// --- 4. Rendering der Historie ---
function renderHistory() {
    historyList.innerHTML = '';

    history.slice(0, 15).forEach(entry => { 
        const li = document.createElement('li');
        const timeStr = new Date(entry.time).toLocaleString();
        
        let sideEffectText = entry.sideEffect ? 
            `<span style="color: red;">(NW: ${entry.sideEffect})</span>` : '';
        
        li.innerHTML = `
            [${timeStr}] - **${entry.medName}**: ${entry.action} (${entry.dosageUsed || 0} Stk.). 
            ${sideEffectText}
        `;
        historyList.appendChild(li);
    });
}

// --- 5. Pop-up Erinnerungslogik ---
document.getElementById('take-med').addEventListener('click', () => {
    if (currentReminderMedication) {
        takeMedication(currentReminderMedication.id);
    }
});
document.getElementById('snooze-med').addEventListener('click', hideReminderPopup);

function showReminderPopup(medication) {
    if (currentReminderMedication && currentReminderMedication.id === medication.id) return; 

    currentReminderMedication = medication;
    popupText.textContent = `Es ist Zeit für die Einnahme von ${medication.name} (${medication.dosage} Stk.)!`;
    popup.classList.remove('reminder-hidden');
    popup.classList.add('reminder-visible');
}

function hideReminderPopup() {
    popup.classList.remove('reminder-visible');
    popup.classList.add('reminder-hidden');
    currentReminderMedication = null;
}

// Überprüfung der Einnahmezeiten (alle 60 Sekunden)
function checkReminders() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); 
    const currentMonthDay = now.getDate(); 
    
    medications.forEach(med => {
        let isTimeForIntake = false;
        
        if (med.frequencyDetail.time === currentTime) {
            
            if (med.frequencyType === 'daily') {
                isTimeForIntake = true;
                
            } else if (med.frequencyType === 'weekly') {
                if (med.frequencyDetail.weekday === currentDay) {
                    isTimeForIntake = true;
                }
                
            } else if (med.frequencyType === 'monthly') {
                if (med.frequencyDetail.monthDay === currentMonthDay) {
                    isTimeForake = true;
                }
            }
        }
        
        if (isTimeForIntake) {
            showReminderPopup(med);
        }
    });
}
setInterval(checkReminders, 60000); 

// --- 6. In-App-Kalender Logik (VOLLSTÄNDIG) ---

function renderDailySchedule(dateString) {
    selectedDateInfo.textContent = dateString;
    dailyScheduleList.innerHTML = '';

    if (medications.length === 0) {
        dailyScheduleList.innerHTML = '<li>Keine Medikamente geplant.</li>';
        return;
    }

    medications
        .filter(med => {
            const date = new Date(dateString);
            const currentDay = date.getDay();
            const currentMonthDay = date.getDate();
            
            if (med.frequencyType === 'daily') return true;
            if (med.frequencyType === 'weekly' && med.frequencyDetail.weekday === currentDay) return true;
            if (med.frequencyType === 'monthly' && med.frequencyDetail.monthDay === currentMonthDay) return true;
            return false;
        })
        .sort((a, b) => a.frequencyDetail.time.localeCompare(b.frequencyDetail.time))
        .forEach(med => {
            const li = document.createElement('li');
            li.textContent = `${med.frequencyDetail.time} Uhr: ${med.name} (${med.dosage} Stk.)`;
            dailyScheduleList.appendChild(li);
        });
}


function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

    document.getElementById('current-month-year').textContent = monthName;
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = `
        <div class="day-name">So</div><div class="day-name">Mo</div><div class="day-name">Di</div>
        <div class="day-name">Mi</div><div class="day-name">Do</div><div class="day-name">Fr</div>
        <div class="day-name">Sa</div>
    `;

    const firstDay = getFirstDayOfMonth(date);
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();
    
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.innerHTML += '<div class="calendar-day"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateString = formatDate(currentDate);
        
        let classes = 'calendar-day'; 
        
        const dateDay = currentDate.getDay();
        const dateMonthDay = currentDate.getDate();
        const hasIntake = medications.some(med => {
            if (med.frequencyType === 'daily') return true;
            if (med.frequencyType === 'weekly' && med.frequencyDetail.weekday === dateDay) return true;
            if (med.frequencyType === 'monthly' && med.frequencyDetail.monthDay === dateMonthDay) return true;
            return false;
        });

        if (hasIntake) {
            classes += ' has-intake';
        }

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            classes += ' current-day';
            renderDailySchedule(dateString); 
        }

        const dayElement = document.createElement('div');
        dayElement.className = classes;
        dayElement.textContent = day;
        dayElement.dataset.date = dateString;

        dayElement.addEventListener('click', () => {
            renderDailySchedule(dayElement.dataset.date);
            document.querySelectorAll('.calendar-day').forEach(d => d.style.backgroundColor = '');
            dayElement.style.backgroundColor = '#b8daff';
        });

        calendarGrid.appendChild(dayElement);
    }
}

document.getElementById('prev-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar(currentCalendarDate);
});

document.getElementById('next-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar(currentCalendarDate);
});


// --- 7. Medizinische Kontakte und E-Mail Daten ---

// Speichert Kontaktdaten bei jeder Eingabe
document.querySelectorAll('#emergency input').forEach(input => {
    input.addEventListener('input', () => {
        doctorData.name = document.getElementById('dr-name').value;
        doctorData.email = document.getElementById('dr-email').value;
        doctorData.userInfo = document.getElementById('user-info').value;
        saveData();
    });
});

// Füllt die Eingabefelder mit gespeicherten Daten
function updateDoctorDataInputs() {
    document.getElementById('dr-name').value = doctorData.name;
    document.getElementById('dr-email').value = doctorData.email;
    document.getElementById('user-info').value = doctorData.userInfo;
}

// --- MODALE FENSTER UND E-MAIL LOGIK ---

// 7a. Rezept-Logik (Modal)
function requestPrescription(medId) {
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    currentPrescriptionMedication = med;
    document.getElementById('modal-med-name').textContent = med.name;
    document.getElementById('modal-pr-notes').value = '';
    prescriptionModal.classList.remove('reminder-hidden');
    prescriptionModal.classList.add('reminder-visible');
}

document.getElementById('modal-cancel-prescription').addEventListener('click', () => {
    prescriptionModal.classList.remove('reminder-visible');
    prescriptionModal.classList.add('reminder-hidden');
    currentPrescriptionMedication = null;
});

document.getElementById('modal-submit-prescription').addEventListener('click', function() {
    if (!currentPrescriptionMedication) return;
    const medName = currentPrescriptionMedication.name;
    const drEmail = doctorData.email;
    if (!drEmail) { alert("Bitte hinterlegen Sie zuerst die E-Mail-Adresse Ihres Arztes."); return; }
    
    const drName = doctorData.name || 'Arzt/Ärztin';
    const userInfo = doctorData.userInfo;
    const notes = document.getElementById('modal-pr-notes').value.trim() || 'Keine zusätzlichen Anmerkungen.';

    const historyEntry = { id: Date.now(), medName: medName, time: new Date().toISOString(), action: 'Rezept angefordert', dosageUsed: 0, sideEffect: null };
    history.unshift(historyEntry);
    saveData();
    renderHistory();
    
    const body = `Sehr geehrte/r ${drName},\n\nich möchte Sie um ein Folgerezept für das folgende Medikament bitten:\n\nMedikament: ${medName}\nAnmerkungen: ${notes}\n\nBitte informieren Sie mich, sobald das Rezept zur Abholung bereitliegt oder an das E-Rezept-System übermittelt wurde.\n\nMit freundlichen Grüßen,\n${userInfo}`;
    const subject = encodeURIComponent(`Rezeptanforderung: ${medName} - ${userInfo}`);
    window.location.href = `mailto:${drEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;

    prescriptionModal.classList.remove('reminder-visible');
    prescriptionModal.classList.add('reminder-hidden');
    currentPrescriptionMedication = null;
});


// 7b. Nebenwirkungen Logik (Modal)
function saveSideEffectToHistory(medName, sideEffect) {
    const historyEntry = { id: Date.now(), medName: medName, time: new Date().toISOString(), action: 'Nebenwirkung vermerkt', dosageUsed: 0, sideEffect: sideEffect };
    history.unshift(historyEntry);
    saveData();
    renderHistory();
}

function reportSideEffect(medId) {
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    currentSideEffectMedication = med;
    document.getElementById('modal-se-med-name').textContent = med.name;
    document.getElementById('modal-se-notes').value = ''; 
    sideEffectModal.classList.remove('reminder-hidden');
    sideEffectModal.classList.add('reminder-visible');
}

document.getElementById('modal-cancel-side-effect').addEventListener('click', () => {
    sideEffectModal.classList.remove('reminder-visible');
    sideEffectModal.classList.add('reminder-hidden');
    currentSideEffectMedication = null;
});

document.getElementById('modal-save-side-effect').addEventListener('click', function() {
    if (!currentSideEffectMedication) return;
    const sideEffect = document.getElementById('modal-se-notes').value;
    if (!sideEffect) { alert("Bitte beschreiben Sie die Nebenwirkung."); return; }
    saveSideEffectToHistory(currentSideEffectMedication.name, sideEffect);
    sideEffectModal.classList.remove('reminder-visible');
    sideEffectModal.classList.add('reminder-hidden');
    currentSideEffectMedication = null;
    alert("Nebenwirkung erfolgreich in der Historie gespeichert.");
});

document.getElementById('modal-submit-side-effect').addEventListener('click', function() {
    if (!currentSideEffectMedication) return;
    const sideEffect = document.getElementById('modal-se-notes').value;
    const medName = currentSideEffectMedication.name;
    const drEmail = doctorData.email;

    if (!drEmail || !sideEffect) { alert("Bitte E-Mail des Arztes und Beschreibung ausfüllen."); return; }
    
    saveSideEffectToHistory(medName, sideEffect); 
    
    const drName = doctorData.name || 'Arzt/Ärztin';
    const userInfo = doctorData.userInfo;
    const body = `Sehr geehrte/r ${drName},\n\nich berichte Ihnen über eine aufgetretene Nebenwirkung im Zusammenhang mit meiner aktuellen Medikation.\n\nBetroffenes Medikament:${medName}\nBeschreibung der Nebenwirkung:\n${sideEffect}\n\nMit freundlichen Grüßen,\n${userInfo}`;
    const subject = encodeURIComponent(`Wichtige Meldung: Nebenwirkung bei Medikation (${medName})`);
    
    window.location.href = `mailto:${drEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;

    sideEffectModal.classList.remove('reminder-visible');
    sideEffectModal.classList.add('reminder-hidden');
    currentSideEffectMedication = null;
});


// 7c. Fragen Logik (Modal)
function askDoctorQuestion(medId) {
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    currentQuestionMedication = med;
    document.getElementById('modal-q-med-name').textContent = med.name;
    document.getElementById('modal-q-subject').value = `Frage zur Medikation: ${med.name}`;
    document.getElementById('modal-q-notes').value = ''; 
    questionModal.classList.remove('reminder-hidden');
    questionModal.classList.add('reminder-visible');
}

document.getElementById('modal-cancel-question').addEventListener('click', () => {
    questionModal.classList.remove('reminder-visible');
    questionModal.classList.add('reminder-hidden');
    currentQuestionMedication = null;
});

document.getElementById('modal-submit-question').addEventListener('click', function() {
    if (!currentQuestionMedication) return;
    const medName = currentQuestionMedication.name;
    const drEmail = doctorData.email;
    const subject = document.getElementById('modal-q-subject').value.trim();
    const question = document.getElementById('modal-q-notes').value.trim();
    
    if (!drEmail || !subject || !question) { alert("Bitte alle Felder ausfüllen."); return; }
    
    const drName = doctorData.name || 'Arzt/Ärztin';
    const userInfo = doctorData.userInfo;
    
    // Historie-Eintrag
    const historyEntry = { id: Date.now(), medName: medName, time: new Date().toISOString(), action: 'Frage an Arzt gesendet', dosageUsed: 0, sideEffect: null };
    history.unshift(historyEntry);
    saveData();
    renderHistory();
    
    const body = `Sehr geehrte/r ${drName},\n\nich habe eine Frage bezüglich meines Medikaments ${medName}:\n\n${question}\n\nIch bitte um kurze Rückmeldung, vielen Dank.\n\nMit freundlichen Grüßen,\n${userInfo}`;
    const mailSubject = encodeURIComponent(`${subject} (${medName})`);
    
    window.location.href = `mailto:${drEmail}?subject=${mailSubject}&body=${encodeURIComponent(body)}`;

    questionModal.classList.remove('reminder-visible');
    questionModal.classList.add('reminder-hidden');
    currentQuestionMedication = null;
});


// --- Event-Listener für Wartungsoptionen ---
document.getElementById('clear-history-btn').addEventListener('click', function() {
    if (confirm("WARNUNG: Sind Sie sicher, dass Sie die gesamte Einnahme-Historie löschen möchten?")) {
        history = [];
        saveData();
        renderHistory();
        alert("Einnahme-Historie wurde geleert.");
    }
});


// --- Initialisierung ---
function initializeApp() {
    updateDoctorDataInputs();
    updateFrequencyFields(); 
    renderMedicationList();
    renderHistory();
    renderCalendar(currentCalendarDate); 
}

initializeApp();

