document.addEventListener('DOMContentLoaded', () => {
    const diaryContainer = document.querySelector('.diary-container');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const passwordModal = document.getElementById('password-modal');
    const passwordInput = document.getElementById('password-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const passwordPrompt = document.getElementById('password-prompt');
    const diarySelect = document.getElementById('diary-select');
    const newDiaryBtn = document.getElementById('new-diary-btn');

    const bookCover = document.querySelector('.book-cover');
    const diaryTitle = document.getElementById('diary-title');
    const editCoverBtn = document.getElementById('edit-cover-btn');

    // Neue Buttons
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    let db;
    let pages = [];
    let currentPageIndex = -1;
    let touchstartX = 0;
    let touchendX = 0;
    let currentDiaryId = 'default';

    // --- IndexedDB Initialisierung ---
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TagebuchDB', 1);
            request.onerror = (event) => reject('IndexedDB-Fehler');
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                db.createObjectStore('tagebuch_eintraege', { keyPath: 'id' });
                db.createObjectStore('tagebuch_namen', { keyPath: 'id' });
            };
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };
        });
    }

    // --- State Management: Speichern der Daten in IndexedDB ---
    function saveAppState() {
        const transaction = db.transaction(['tagebuch_eintraege', 'tagebuch_namen'], 'readwrite');
        const store = transaction.objectStore('tagebuch_eintraege');
        const diaryEntry = {
            id: currentDiaryId,
            pages: pages.map(page => {
                const textarea = page.querySelector('textarea');
                const dateSpan = page.querySelector('.page-date');
                const image = page.querySelector('.uploaded-image');
                return {
                    text: textarea.value,
                    date: dateSpan.textContent,
                    image: image && image.src.startsWith('data:image') ? image.src : ''
                };
            }),
            coverSettings: {
                title: diaryTitle.textContent,
                backgroundColor: bookCover.style.backgroundColor
            }
        };
        store.put(diaryEntry);
        const namesStore = transaction.objectStore('tagebuch_namen');
        let diaryNames = JSON.parse(localStorage.getItem('diaryNames')) || ['default'];
        if (!diaryNames.includes(currentDiaryId)) {
            diaryNames.push(currentDiaryId);
            localStorage.setItem('diaryNames', JSON.stringify(diaryNames));
        }
        namesStore.put({ id: 'list', names: diaryNames });
    }

    // --- Laden der Daten aus IndexedDB ---
    function loadAppState() {
        initDB().then(() => {
            const transaction = db.transaction('tagebuch_namen', 'readonly');
            const store = transaction.objectStore('tagebuch_namen');
            const getRequest = store.get('list');
            getRequest.onsuccess = (event) => {
                let savedNames = event.target.result ? event.target.result.names : ['default'];
                localStorage.setItem('diaryNames', JSON.stringify(savedNames));
                updateDiaryList();
                loadDiary(currentDiaryId);
            };
        });
    }

    function loadDiary(diaryId) {
        currentDiaryId = diaryId;
        diaryContainer.querySelectorAll('.page').forEach(page => page.remove());
        pages = [];
        currentPageIndex = -1;
        const transaction = db.transaction('tagebuch_eintraege', 'readonly');
        const store = transaction.objectStore('tagebuch_eintraege');
        const getRequest = store.get(currentDiaryId);
        getRequest.onsuccess = (event) => {
            const result = event.target.result;
            const diaryContent = result ? result.pages : [{ text: '', date: '', image: '' }];
            const coverSettings = result ? result.coverSettings : null;
            diaryContent.forEach((content) => {
                const page = addNewPage(content.text, content.date, content.image);
                pages.push(page);
            });
            loadCoverSettings(coverSettings);
            showCurrentPage();
        };
    }

    function loadCoverSettings(settings) {
        if (settings) {
            diaryTitle.textContent = settings.title;
            bookCover.style.backgroundColor = settings.backgroundColor;
        } else {
            diaryTitle.textContent = "Mein Tagebuch";
            bookCover.style.backgroundColor = "#5d4037";
        }
    }

    // --- Seitenverwaltung ---
    function addNewPage(content = "", dateContent = "", imageSrc = "") {
        const newPage = document.createElement('div');
        newPage.classList.add('page');
        const initialDate = dateContent || '';
        newPage.innerHTML = `
            <div class="page-header">
                <span class="page-date">${initialDate}</span>
                <input type="file" accept="image/*" class="image-upload-input" style="display:none;">
                <button class="upload-image-btn">Foto hinzufügen</button>
            </div>
            <div class="uploaded-image-container">
                <img src="${imageSrc}" class="uploaded-image" style="display: ${imageSrc ? 'block' : 'none'};">
                <button class="remove-image-btn" style="display: ${imageSrc ? 'block' : 'none'};">x</button>
            </div>
            <textarea placeholder=""></textarea>
        `;
        const textarea = newPage.querySelector('textarea');
        textarea.value = content;
        const dateSpan = newPage.querySelector('.page-date');
        const uploadBtn = newPage.querySelector('.upload-image-btn');
        const uploadInput = newPage.querySelector('.image-upload-input');
        const uploadedImage = newPage.querySelector('.uploaded-image');
        const removeBtn = newPage.querySelector('.remove-image-btn');
        textarea.addEventListener('input', () => {
            if (!dateSpan.textContent) {
                const now = new Date();
                const formattedDate = now.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
                dateSpan.textContent = formattedDate;
            }
            saveAppState();
        });
        uploadBtn.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadedImage.src = event.target.result;
                    uploadedImage.style.display = 'block';
                    removeBtn.style.display = 'block';
                    saveAppState();
                };
                reader.readAsDataURL(file);
            }
        });
        removeBtn.addEventListener('click', () => {
            uploadedImage.src = '';
            uploadedImage.style.display = 'none';
            removeBtn.style.display = 'none';
            saveAppState();
        });
        diaryContainer.insertBefore(newPage, document.querySelector('.controls'));
        return newPage;
    }

    // --- Navigation und Animation ---
    function showCurrentPage() {
        if (currentPageIndex === -1) {
            bookCover.style.transform = 'rotateY(0deg)';
        } else {
            bookCover.style.transform = 'rotateY(-180deg)';
        }
        pages.forEach((page, index) => {
            if (index === currentPageIndex) {
                page.style.transform = 'rotateY(0deg)';
                page.style.zIndex = '2';
                page.style.display = 'block';
            } else if (index < currentPageIndex) {
                page.style.transform = 'rotateY(-180deg)';
                page.style.zIndex = '1';
                page.style.display = 'block';
            } else {
                page.style.transform = 'rotateY(0deg)';
                page.style.zIndex = '0';
                page.style.display = 'none';
            }
        });
    }

    function nextPage() {
        if (currentPageIndex === pages.length - 1) {
            const newPage = addNewPage();
            pages.push(newPage);
        }
        currentPageIndex++;
        showCurrentPage();
        saveAppState();
    }

    function prevPage() {
        if (currentPageIndex > -1) {
            currentPageIndex--;
        }
        showCurrentPage();
        saveAppState();
    }

    // --- UI-Events ---
    function updateDiaryList() {
        let diaryNames = JSON.parse(localStorage.getItem('diaryNames')) || ['default'];
        diarySelect.innerHTML = '';
        diaryNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            diarySelect.appendChild(option);
        });
        diarySelect.value = currentDiaryId;
    }

    // --- Export-Funktion ---
    function exportDiary() {
        if (!localStorage.getItem('diaryPin')) {
            alert('Bitte lege zuerst eine PIN fest, um das Tagebuch exportieren zu können.');
            return;
        }
        const pin = localStorage.getItem('diaryPin');
        const transaction = db.transaction('tagebuch_eintraege', 'readonly');
        const store = transaction.objectStore('tagebuch_eintraege');
        const getRequest = store.get(currentDiaryId);
        getRequest.onsuccess = (event) => {
            const diaryData = event.target.result;
            const jsonString = JSON.stringify(diaryData);
            const encryptedData = CryptoJS.AES.encrypt(jsonString, pin).toString();
            const blob = new Blob([encryptedData], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${currentDiaryId}.tagebuch`;
            link.click();
            URL.revokeObjectURL(link.href);
            alert('Tagebuch wurde exportiert! Du kannst die Datei jetzt teilen. Der Empfänger benötigt deine PIN zum Entsperren.');
        };
    }

    // --- Import-Funktion ---
    function importDiary(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const encryptedData = event.target.result;
            const pinPrompt = prompt('Gib die PIN für das importierte Tagebuch ein:');
            if (!pinPrompt) return;
            try {
                const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, pinPrompt);
                const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
                const importedDiary = JSON.parse(decryptedData);
                const newDiaryId = importedDiary.id;
                const transaction = db.transaction('tagebuch_eintraege', 'readwrite');
                const store = transaction.objectStore('tagebuch_eintraege');
                store.put(importedDiary);
                localStorage.setItem('diaryNames', JSON.stringify(JSON.parse(localStorage.getItem('diaryNames') || '[]').concat([newDiaryId])));
                alert('Tagebuch erfolgreich importiert!');
                loadAppState();
            } catch (e) {
                alert('Falsche PIN oder beschädigte Datei!');
            }
        };
        reader.readAsText(file);
    }

    // --- Initialisierung ---
    function initializeDiary() {
        nextBtn.addEventListener('click', nextPage);
        prevBtn.addEventListener('click', prevPage);
        diarySelect.addEventListener('change', (e) => loadDiary(e.target.value));
        newDiaryBtn.addEventListener('click', () => {
            const newName = prompt('Gib einen Namen für dein neues Tagebuch ein:');
            if (newName) {
                loadDiary(newName);
                updateDiaryList();
                saveAppState();
            }
        });
        editCoverBtn.addEventListener('click', () => {
            const newTitle = prompt('Gib einen neuen Titel für das Tagebuch ein:');
            if (newTitle !== null) {
                diaryTitle.textContent = newTitle;
            }
            const newColor = prompt('Gib einen neuen Farbcode (z.B. #FF5733) oder einen Farbnamen (z.B. blue) ein:');
            if (newColor !== null) {
                bookCover.style.backgroundColor = newColor;
            }
            saveAppState();
        });
        exportBtn.addEventListener('click', exportDiary);
        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importDiary(e.target.files[0]);
            }
        });
        diaryContainer.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        });
        diaryContainer.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            const minSwipeDistance = 50;
            if (touchendX < touchstartX && Math.abs(touchendX - touchstartX) > minSwipeDistance) {
                nextPage();
            }
            if (touchendX > touchstartX && Math.abs(touchendX - touchstartX) > minSwipeDistance) {
                prevPage();
            }
        });
        loadAppState();
    }

    function checkPassword() {
        const savedPin = localStorage.getItem('diaryPin');
        if (savedPin) {
            passwordPrompt.textContent = 'Gib deine PIN ein:';
            unlockBtn.addEventListener('click', () => {
                if (passwordInput.value === savedPin) {
                    passwordModal.style.display = 'none';
                    initializeDiary();
                } else {
                    alert('Falsche PIN!');
                }
            });
        } else {
            passwordPrompt.textContent = 'Lege eine 4-stellige PIN fest:';
            unlockBtn.textContent = 'PIN festlegen';
            unlockBtn.addEventListener('click', () => {
                if (passwordInput.value.length === 4) {
                    localStorage.setItem('diaryPin', passwordInput.value);
                    passwordModal.style.display = 'none';
                    initializeDiary();
                } else {
                    alert('PIN muss 4 Stellen lang sein!');
                }
            });
        }
    }
    checkPassword();
});
