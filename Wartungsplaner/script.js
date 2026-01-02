// 1. Deklarationen GANZ OBEN (Wichtig für den Fehler im Bild)
let tasks = JSON.parse(localStorage.getItem('maint_final_v1')) || [];
let filteredTasksGlobal = []; 

// 2. Initiales Rendern
renderTasks();

// 3. Funktionen
function addTask() {
    const nameInput = document.getElementById('taskName');
    const intervalInput = document.getElementById('taskInterval');
    const categoryInput = document.getElementById('taskCategory');
    
    if (nameInput.value && intervalInput.value) {
        tasks.push({
            name: nameInput.value,
            category: categoryInput.value,
            interval: parseInt(intervalInput.value),
            lastDone: new Date().toISOString(),
            history: []
        });
        saveAndRefresh();
        nameInput.value = '';
        intervalInput.value = '';
    }
}

function completeTask(index) {
    const dateStr = new Date().toLocaleDateString('de-DE');
    // Nutze die globale gefilterte Liste, um das richtige Original-Objekt zu finden
    const taskName = filteredTasksGlobal[index].name;
    const realIndex = tasks.findIndex(t => t.name === taskName);
    
    tasks[realIndex].history.unshift(dateStr);
    if(tasks[realIndex].history.length > 3) tasks[realIndex].history.pop();
    tasks[realIndex].lastDone = new Date().toISOString();
    
    saveAndRefresh();
}

function deleteTask(index) {
    if(confirm('Aufgabe wirklich löschen?')) {
        const taskName = filteredTasksGlobal[index].name;
        tasks = tasks.filter(t => t.name !== taskName);
        saveAndRefresh();
    }
}

function saveAndRefresh() {
    localStorage.setItem('maint_final_v1', JSON.stringify(tasks));
    renderTasks();
}

function exportData() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wartung_backup.json`;
    link.click();
}

function importData(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                tasks = imported;
                saveAndRefresh();
            }
        } catch (err) { alert("Fehler!"); }
    };
    reader.readAsText(event.target.files[0]);
}

function renderTasks() {
    const list = document.getElementById('taskList');
    const searchInput = document.getElementById('searchText');
    const filterCatInput = document.getElementById('filterCategory');
    
    // Falls die Elemente noch nicht existieren (beim ersten Laden)
    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const filterCat = filterCatInput ? filterCatInput.value : "Alle";
    
    list.innerHTML = '';

    // Filtern
    let filteredTasks = tasks.filter(task => {
        const matchesText = task.name.toLowerCase().includes(searchText);
        const matchesCat = (filterCat === 'Alle' || task.category === filterCat);
        return matchesText && matchesCat;
    });

    // Sortieren
    filteredTasks.sort((a, b) => {
        const nextA = new Date(a.lastDone).getTime() + (a.interval * 86400000);
        const nextB = new Date(b.lastDone).getTime() + (b.interval * 86400000);
        return nextA - nextB;
    });

    // Zuweisung an die globale Variable (für completeTask/deleteTask)
    filteredTasksGlobal = filteredTasks;

    filteredTasks.forEach((task, index) => {
        const lastDate = new Date(task.lastDone);
        const nextDate = new Date(lastDate.getTime() + (task.interval * 86400000));
        const today = new Date();
        const percent = Math.min(Math.max(Math.round(((today - lastDate) / (task.interval * 86400000)) * 100), 0), 100);
        const diffDays = Math.ceil((nextDate - today) / 86400000);

        list.innerHTML += `
            <div class="task-item">
                <div class="category-icon">${task.category || '🏠'}</div>
                <div class="task-content">
                    <div class="task-header">
                        <div class="task-title">${task.name}</div>
                        <div style="font-size: 0.8em; font-weight: bold; color: ${diffDays <= 0 ? 'var(--danger)' : '#666'}">
                            ${diffDays <= 0 ? 'FÄLLIG' : diffDays + ' T.'}
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${percent}%; background: ${percent >= 100 ? 'var(--danger)' : (percent > 75 ? 'var(--warning)' : 'var(--success)')}"></div>
                    </div>
                    <div class="history"><b>Zuletzt:</b> ${task.history.join(', ') || 'Keine Daten'}</div>
                    <div class="actions">
                        <button class="done-btn" onclick="completeTask(${index})">✔</button>
                        <button class="delete-btn" onclick="deleteTask(${index})">🗑</button>
                    </div>
                </div>
            </div>`;
    });
}
