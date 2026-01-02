document.addEventListener('DOMContentLoaded', () => {
    // DOM-Elemente abrufen 
    const itemNameInput = document.getElementById('itemName');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const itemItemsPerUnitInput = document.getElementById('itemItemsPerUnit'); 
    const notificationThresholdInput = document.getElementById('notificationThreshold');
    
    const addItemBtn = document.getElementById('addItemBtn');
    const itemListDiv = document.getElementById('itemList');
    
    // NEU: Modal-Elemente
    const notificationModal = document.getElementById('notificationModal');
    const modalNotificationsContent = document.getElementById('modalNotificationsContent');
    const confirmNotificationsBtn = document.getElementById('confirmNotificationsBtn');

    // FESTE STANDARDWERTE
    const DEFAULT_UNIT = 'Packung'; 
    const DEFAULT_CATEGORY = 'Allgemein'; 
    const DEFAULT_NOTIFICATION_THRESHOLD = 5;

    // Lokalen Speicher initialisieren oder laden
    let items = [];
    try {
        const storedItems = localStorage.getItem('vorratItems');
        if (storedItems) {
            items = JSON.parse(storedItems);
        }
    } catch (e) {
        alert("Fehler beim Laden alter Daten. Ihr Vorrat wurde zurückgesetzt. " + e.message);
        localStorage.removeItem('vorratItems');
        items = [];
    }

    // Sicherstellen, dass alle Item-Objekte korrekt sind
    items = items.map(item => ({
        name: item.name || 'Unbekannter Artikel',
        quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity >= 0 ? item.quantity : 0,
        unit: item.unit || DEFAULT_UNIT,
        itemsPerUnit: typeof item.itemsPerUnit === 'number' && !isNaN(item.itemsPerUnit) && item.itemsPerUnit >= 1 ? item.itemsPerUnit : 1,
        category: item.category || DEFAULT_CATEGORY,
        currentOpenedItemAmount: typeof item.currentOpenedItemAmount === 'number' && !isNaN(item.currentOpenedItemAmount) ? item.currentOpenedItemAmount : 0,
        notificationThreshold: typeof item.notificationThreshold === 'number' && !isNaN(item.notificationThreshold) && item.notificationThreshold >= 0 ? item.notificationThreshold : DEFAULT_NOTIFICATION_THRESHOLD,
    })).filter(item => item.name !== 'Unbekannter Artikel');


    // KERNLOGIK: Verarbeitet jeden Abzug beliebiger Menge
    function processUsage(index, usageAmount) {
        if (index === undefined || items[index] === undefined) {
            return;
        }

        const item = items[index];

        if (item.quantity === 0 && item.currentOpenedItemAmount === 0) {
            alert(`${item.name} ist bereits komplett leer! Kann nicht weiter verbraucht werden.`);
            return;
        }

        if (isNaN(usageAmount) || usageAmount <= 0 || !Number.isInteger(usageAmount)) {
            alert('Die Verbrauchsmenge muss eine positive Ganzzahl sein.');
            return;
        }

        let remainingToUse = usageAmount;
        let totalItemsInOpenedUnit = item.currentOpenedItemAmount;
        let totalUnits = item.quantity;

        // 1. Zuerst aus der bereits geöffneten Menge entnehmen
        if (totalItemsInOpenedUnit > 0) {
            const usedFromOpened = Math.min(remainingToUse, totalItemsInOpenedUnit);
            totalItemsInOpenedUnit -= usedFromOpened;
            remainingToUse -= usedFromOpened;
        }

        // 2. Dann ganze Packungen öffnen, wenn noch Stücke benötigt werden
        while (remainingToUse > 0 && totalUnits > 0) {
            totalUnits -= 1; 
            totalItemsInOpenedUnit += item.itemsPerUnit; 

            const usedFromNewUnit = Math.min(remainingToUse, totalItemsInOpenedUnit);
            totalItemsInOpenedUnit -= usedFromNewUnit;
            remainingToUse -= usedFromNewUnit;
        }

        // 3. Überprüfen, ob genügend Vorrat vorhanden war
        if (remainingToUse > 0) {
             alert(`Achtung: Es konnten nur ${usageAmount - remainingToUse} von ${usageAmount} Einzelstücken entnommen werden, da der Vorrat leer ist.`);
        }

        // Werte aktualisieren
        item.currentOpenedItemAmount = totalItemsInOpenedUnit;
        item.quantity = totalUnits;

        saveItems();
        renderItems();
        // displayNotifications() wird nun nur noch vom Modal-Code aufgerufen
        showOrHideNotificationModal(); 
    }

    // Zieht nur 1 Stück ab (für den Kurzklick)
    function useSingleItem(index) {
        processUsage(index, 1);
    }
    
    // Fragt nach Menge und ruft processUsage auf (für den Langklick)
    function useMultiItem(index) {
        const item = items[index];

        if (item.quantity === 0 && item.currentOpenedItemAmount === 0) {
            alert(`${item.name} ist bereits komplett leer!`);
            return;
        }
        
        const usageAmountStr = prompt(`Wie viele Einzelstücke von "${item.name}" (Stück pro Einheit: ${item.itemsPerUnit}) wurden entnommen?`);
        
        if (usageAmountStr === null || usageAmountStr.trim() === '') {
            return; 
        }

        const usageAmount = parseInt(usageAmountStr);
        
        if (isNaN(usageAmount) || usageAmount <= 0 || !Number.isInteger(usageAmount)) {
            alert('Bitte geben Sie eine gültige positive Ganzzahl ein.');
            return;
        }
        
        processUsage(index, usageAmount);
    }

    // ARTIKEL AUFFÜLLEN
    function refillItem(index) {
        if (index === undefined || items[index] === undefined) {
            return;
        }

        const item = items[index];
        const refillAmountStr = prompt(`Wie viele ${item.unit} von "${item.name}" möchten Sie hinzufügen?`);

        if (refillAmountStr === null || refillAmountStr.trim() === '') {
            return;
        }

        const refillAmount = parseFloat(refillAmountStr);

        if (!isNaN(refillAmount) && refillAmount > 0) {
            item.quantity += refillAmount;
            saveItems();
            renderItems();
            showOrHideNotificationModal();
        } else {
            alert('Bitte geben Sie eine gültige positive Zahl ein.');
        }
    }
    
    // ARTIKEL LÖSCHEN
    function deleteItem(index) {
        if (confirm(`Sind Sie sicher, dass Sie "${items[index].name}" löschen möchten?`)) {
            items.splice(index, 1);
            saveItems();
            renderItems();
            showOrHideNotificationModal();
        }
    }

    // ARTIKEL HINZUFÜGEN
    function addItem() {
        const name = itemNameInput.value.trim();
        const quantity = parseFloat(itemQuantityInput.value);
        
        let itemsPerUnit;
        const itemsPerUnitValue = itemItemsPerUnitInput.value.trim();
        if (itemsPerUnitValue === '' || isNaN(parseInt(itemsPerUnitValue)) || parseInt(itemsPerUnitValue) < 1) {
            alert('Stück pro Packung muss eine Zahl größer oder gleich 1 sein!');
            return;
        } else {
            itemsPerUnit = parseInt(itemsPerUnitValue);
        }
        
        const unit = DEFAULT_UNIT; 
        const category = DEFAULT_CATEGORY; 

        const notificationThreshold = parseFloat(notificationThresholdInput.value);
        const isNotificationThresholdValid = !isNaN(notificationThreshold) && notificationThreshold >= 0;
        
        const isQuantityValid = !isNaN(quantity) && quantity >= 0;

        if (name && isQuantityValid && isNotificationThresholdValid) {
            const existingItemIndex = items.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

            if (existingItemIndex > -1) {
                items[existingItemIndex].quantity += quantity;
                items[existingItemIndex].itemsPerUnit = itemsPerUnit; 
                items[existingItemIndex].notificationThreshold = notificationThreshold;
            } else {
                const newItem = {
                    name: name,
                    quantity: quantity,
                    unit: unit, 
                    itemsPerUnit: itemsPerUnit, 
                    category: category, 
                    currentOpenedItemAmount: 0,
                    notificationThreshold: notificationThreshold,
                };
                items.push(newItem);
            }

            saveItems();
            renderItems();
            showOrHideNotificationModal();

            itemNameInput.value = '';
            itemQuantityInput.value = '';
            itemItemsPerUnitInput.value = '1'; 
            notificationThresholdInput.value = DEFAULT_NOTIFICATION_THRESHOLD;
        } else {
            let errorMessage = 'Bitte alle Felder korrekt ausfüllen:\n';
            if (!name) errorMessage += '- Artikelname darf nicht leer sein.\n';
            if (!isQuantityValid) errorMessage += '- Menge muss eine positive Zahl sein.\n';
            if (!isNotificationThresholdValid) errorMessage += '- Benachrichtigungsschwellenwert muss eine positive Zahl sein.\n';
            alert(errorMessage);
        }
    }


    // ARTIKEL RENDERN
    function renderItems() {
        itemListDiv.innerHTML = '';
        if (items.length === 0) {
            itemListDiv.innerHTML = '<p>Noch keine Artikel vorhanden.</p>';
            return;
        }

        items.forEach((item, index) => {
            const name = item.name || 'Unbekannter Artikel';
            const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 0;
            const unit = item.unit || DEFAULT_UNIT;
            const itemsPerUnit = item.itemsPerUnit !== undefined && item.itemsPerUnit !== null ? item.itemsPerUnit : 1;
            const category = item.category || DEFAULT_CATEGORY;
            const currentOpenedItemAmount = item.currentOpenedItemAmount !== undefined && item.currentOpenedItemAmount !== null ? item.currentOpenedItemAmount : 0;
            const notificationThreshold = item.notificationThreshold !== undefined && item.notificationThreshold !== null ? item.notificationThreshold : DEFAULT_NOTIFICATION_THRESHOLD;

            const totalIndividualItemsOverall = (quantity * itemsPerUnit) + currentOpenedItemAmount;

            const itemElement = document.createElement('div');
            itemElement.classList.add('item');

            let quantityText = `${quantity} ${unit}`;
            if (itemsPerUnit > 1 && quantity > 0 && currentOpenedItemAmount > 0) {
                quantityText += ` (+ ${currentOpenedItemAmount} Einzel aus geöffneter Packung)`;
            } else if (itemsPerUnit > 1 && quantity === 0 && currentOpenedItemAmount > 0) {
                quantityText = `${currentOpenedItemAmount} Einzel übrig (letzte Packung geöffnet)`;
            } else if (quantity === 0 && currentOpenedItemAmount === 0) {
                quantityText = `0 ${unit} (leer)`;
            }

            itemElement.innerHTML = `
                <div class="item-info">
                    <strong>${name}</strong>: ${quantityText}
                    <div class="item-details">
                        (${totalIndividualItemsOverall} Stück gesamt) - Kategorie: ${category}
                        (Einheit: ${unit}, **${itemsPerUnit} Stück pro Einheit**)
                        (Benachrichtigung bei <= ${notificationThreshold} Stück)
                    </div>
                </div>
                <div class="item-actions">
                    <button class="refill-btn" data-index="${index}">Auffüllen</button>
                    <button class="use-btn" data-index="${index}">Verbrauchen</button> 
                    <button class="delete-btn" data-index="${index}">Löschen</button>
                </div>
            `;
            itemListDiv.appendChild(itemElement);
        });
    }

    // NEU: Benachrichtigungen für das MODAL sammeln
    function getCriticalItems() {
        const criticalItems = [];

        items.forEach(item => {
            const threshold = item.notificationThreshold;
            const totalIndividualItemsInStock = (item.quantity * item.itemsPerUnit) + item.currentOpenedItemAmount;

            if (totalIndividualItemsInStock <= threshold) {
                criticalItems.push({
                    name: item.name,
                    totalIndividualItems: totalIndividualItemsInStock,
                    threshold: threshold,
                    unit: item.unit,
                    quantity: item.quantity,
                    currentOpenedItemAmount: item.currentOpenedItemAmount,
                    itemsPerUnit: item.itemsPerUnit
                });
            }
        });
        return criticalItems.sort((a, b) => (a.totalIndividualItems - a.threshold) - (b.totalIndividualItems - b.threshold));
    }
    
    // NEU: Pop-up steuern
    function showOrHideNotificationModal() {
        const criticalItems = getCriticalItems();

        if (criticalItems.length > 0) {
            modalNotificationsContent.innerHTML = '';
            criticalItems.forEach(item => {
                const notificationElement = document.createElement('p');
                notificationElement.classList.add('notification-item-modal');
                let message = `${item.name}: `;
                
                if (item.totalIndividualItems <= 0) {
                    message += `Der Vorrat ist **leer**! Bitte nachkaufen.`;
                } else {
                    let quantityDetails = `${item.quantity} ${item.unit}`;
                    if (item.itemsPerUnit > 1 && item.currentOpenedItemAmount > 0) {
                        quantityDetails += ` (+ ${item.currentOpenedItemAmount} Einzel)`;
                    }

                    message += `Nur noch ${quantityDetails} (${item.totalIndividualItems} Stück gesamt) verfügbar!`;
                }
                notificationElement.innerHTML = message;
                modalNotificationsContent.appendChild(notificationElement);
            });
            notificationModal.style.display = 'block';
        } else {
            notificationModal.style.display = 'none';
        }
    }
    
    // NEU: Event Listener für den Bestätigen-Button
    confirmNotificationsBtn.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });

    // SPEICHERN (Bleibt gleich)
    function saveItems() {
        try {
            const itemsString = JSON.stringify(items);
            localStorage.setItem('vorratItems', itemsString);
        } catch (e) {
            alert("Ein interner Fehler ist aufgetreten: Daten konnten nicht gespeichert werden. " + e.message);
        }
    }

    // --- LOGIK FÜR KURZ- / LANG-TAP (Bleibt gleich) ---
    let pressTimer;
    let isLongPress = false;
    const LONG_PRESS_THRESHOLD = 500; 

    addItemBtn.addEventListener('click', addItem);

    itemListDiv.addEventListener('touchstart', handlePressStart, true);
    itemListDiv.addEventListener('mousedown', handlePressStart, true);
    
    itemListDiv.addEventListener('touchend', handlePressEnd, true);
    itemListDiv.addEventListener('mouseup', handlePressEnd, true);

    function handlePressStart(e) {
        const target = e.target.closest('.use-btn');
        if (!target) return;

        if (pressTimer) {
            clearTimeout(pressTimer);
        }

        pressTimer = setTimeout(() => {
            isLongPress = true;
            const index = parseInt(target.dataset.index);
            if (!isNaN(index)) {
                useMultiItem(index); 
            }
            clearTimeout(pressTimer); 
            pressTimer = null;
        }, LONG_PRESS_THRESHOLD);

        isLongPress = false;
        
        if (e.type.startsWith('touch')) {
            e.preventDefault(); 
        }
    }

    function handlePressEnd(e) {
        const target = e.target.closest('.use-btn');
        
        if (!target || isLongPress) {
            clearTimeout(pressTimer);
            pressTimer = null;
            isLongPress = false;
            return;
        }

        if (pressTimer) {
            clearTimeout(pressTimer); 

            if (!isLongPress) {
                const index = parseInt(target.dataset.index);
                if (!isNaN(index)) {
                    useSingleItem(index); 
                }
            }
        }
        
        isLongPress = false;
        pressTimer = null;
    }
    
    // Allgemeiner Klick-Listener für die restlichen Buttons (Auffüllen, Löschen)
    itemListDiv.addEventListener('click', (e) => {
        if (!e.target.classList.contains('use-btn')) {
            const index = parseInt(e.target.dataset.index);
            if (isNaN(index)) return;

            if (e.target.classList.contains('refill-btn')) {
                refillItem(index);
            } else if (e.target.classList.contains('delete-btn')) {
                deleteItem(index);
            }
        }
    });

    // Initialer Render und Benachrichtigungen
    renderItems();
    showOrHideNotificationModal();
}); 

