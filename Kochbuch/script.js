document.addEventListener('DOMContentLoaded', () => {
    // DOM-Elemente abrufen
    const recipeNameInput = document.getElementById('recipe-name');
    const prepTimeInput = document.getElementById('prep-time');
    const servingsInput = document.getElementById('servings');
    const ingredientsInput = document.getElementById('ingredients');
    const instructionsInput = document.getElementById('instructions');
    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const updateRecipeBtn = document.getElementById('update-recipe-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editRecipeIdInput = document.getElementById('edit-recipe-id');
    const recipesUl = document.getElementById('recipes-ul');
    const generateShoppingListBtn = document.getElementById('generate-shopping-list-btn');
    const shoppingListDiv = document.getElementById('shopping-list');
    const clearShoppingListBtn = document.getElementById('clear-shopping-list-btn');
    const shoppingListSelectionDiv = document.getElementById('shopping-list-selection');
    const manualIngredientItemInput = document.getElementById('manual-ingredient-item');
    const addManualIngredientBtn = document.getElementById('add-manual-ingredient-btn');
    const allergenCheckBtn = document.getElementById('allergen-check-btn');
    const searchInput = document.getElementById('search-input');
    const filterCategorySelect = document.getElementById('filter-category');
    const importExportTextarea = document.getElementById('import-export-textarea');
    const importRecipesBtn = document.getElementById('import-recipes-btn');
    const exportRecipesBtn = document.getElementById('export-recipes-btn');
    const recipeCategorySelect = document.getElementById('recipe-category'); // Dropdown für Rezeptkategorie

    // Konstanten
    const ALLERGEN_CHECK_URL = 'allergiecheck.html';

    // Datenstrukturen
    let recipes = [];
    let currentShoppingListItems = [];

    // --- LocalStorage Funktionen ---
    function saveRecipes() {
        localStorage.setItem('recipes', JSON.stringify(recipes));
    }

    function loadRecipes() {
        const storedRecipes = localStorage.getItem('recipes');
        if (storedRecipes) {
            recipes = JSON.parse(storedRecipes);
            renderRecipes();
            renderShoppingListSelection();
        }
    }

    function saveShoppingList() {
        localStorage.setItem('shoppingListItems', JSON.stringify(currentShoppingListItems));
    }

    function loadShoppingList() {
        const storedShoppingList = localStorage.getItem('shoppingListItems');
        if (storedShoppingList) {
            currentShoppingListItems = JSON.parse(storedShoppingList);
            renderShoppingList();
        }
    }

    // --- Rezeptformular Funktionen ---
    function resetRecipeForm() {
        recipeNameInput.value = '';
        prepTimeInput.value = '30';
        servingsInput.value = '4';
        ingredientsInput.value = '';
        instructionsInput.value = '';
        editRecipeIdInput.value = '';
        addRecipeBtn.style.display = 'inline-block';
        updateRecipeBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        recipeCategorySelect.value = ''; // Reset Kategorie-Auswahl
    }

    // --- Event Listener für Rezeptverwaltung ---
    addRecipeBtn.addEventListener('click', () => {
        const name = recipeNameInput.value.trim();
        const prepTime = parseInt(prepTimeInput.value);
        const servings = parseInt(servingsInput.value);
        const ingredients = ingredientsInput.value.trim().split('\n').filter(item => item.trim() !== '');
        const instructions = instructionsInput.value.trim();
        const category = recipeCategorySelect.value; // Kategorie aus Dropdown
        if (name && ingredients.length > 0 && instructions && prepTime > 0 && servings > 0) {
            const newRecipe = {
                id: Date.now(),
                name,
                prepTime,
                servings,
                ingredients,
                instructions,
                category: category
            };
            recipes.push(newRecipe);
            saveRecipes();
            renderRecipes();
            renderShoppingListSelection();
            resetRecipeForm();
        } else {
            alert('Bitte füllen Sie alle Felder korrekt aus (Zubereitungszeit und Portionen müssen größer als 0 sein)!');
        }
    });

    updateRecipeBtn.addEventListener('click', () => {
        const idToUpdate = parseInt(editRecipeIdInput.value);
        const name = recipeNameInput.value.trim();
        const prepTime = parseInt(prepTimeInput.value);
        const servings = parseInt(servingsInput.value);
        const ingredients = ingredientsInput.value.trim().split('\n').filter(item => item.trim() !== '');
        const instructions = instructionsInput.value.trim();
        const category = recipeCategorySelect.value; // Kategorie aus Dropdown

        if (name && ingredients.length > 0 && instructions && prepTime > 0 && servings > 0) {
            const recipeIndex = recipes.findIndex(r => r.id === idToUpdate);
            if (recipeIndex !== -1) {
                recipes[recipeIndex] = {
                    id: idToUpdate,
                    name,
                    prepTime,
                    servings,
                    ingredients,
                    instructions,
                    category: category
                };
                saveRecipes();
                renderRecipes();
                renderShoppingListSelection();
                resetRecipeForm();
            } else {
                alert('Rezept nicht gefunden zum Aktualisieren!');
            }
        } else {
            alert('Bitte füllen Sie alle Felder korrekt aus (Zubereitungszeit und Portionen müssen größer als 0 sein)!');
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        resetRecipeForm();
    });

    // --- Rezept-Rendering Funktionen ---
    function renderRecipes() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = filterCategorySelect.value;

        recipesUl.innerHTML = '';
        recipes
        .filter(recipe => {
            return recipe.name.toLowerCase().includes(searchTerm) &&
                   (selectedCategory === '' || recipe.category === selectedCategory);
        })
        .forEach(recipe => {
            const li = document.createElement('li');
            li.className = 'recipe-card';
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'recipe-details';
            detailsDiv.style.display = 'none';

            detailsDiv.innerHTML = `
                <p><strong>Zubereitungszeit:</strong> ${recipe.prepTime} Minuten</p>
                <p><strong>Portionen:</strong> ${recipe.servings}</p>
                <p><strong>Kategorie:</strong> ${recipe.category}</p>
                <h4>Zutaten:</h4>
                <pre>${recipe.ingredients.join('\n')}</pre>
                <h4>Zubereitung:</h4>
                <pre>${recipe.instructions}</pre>
            `;

            li.innerHTML = `
                <h3>${recipe.name}</h3>
                <div class="recipe-actions">
                    <button class="details-toggle-btn" data-id="${recipe.id}">Details anzeigen</button>
                    <button class="edit-recipe-btn" data-id="${recipe.id}">Bearbeiten</button>
                    <button class="delete-recipe-btn" data-id="${recipe.id}">Löschen</button>
                </div>
            `;
            li.appendChild(detailsDiv);

            li.querySelector('.details-toggle-btn').addEventListener('click', (event) => {
                if (detailsDiv.style.display === 'none') {
                    detailsDiv.style.display = 'block';
                    event.target.textContent = 'Details ausblenden';
                } else {
                    detailsDiv.style.display = 'none';
                    event.target.textContent = 'Details anzeigen';
                }
            });

            li.querySelector('.edit-recipe-btn').addEventListener('click', (event) => {
                const recipeId = parseInt(event.target.dataset.id);
                const recipeToEdit = recipes.find(r => r.id === recipeId);

                if (recipeToEdit) {
                    recipeNameInput.value = recipeToEdit.name;
                    prepTimeInput.value = recipeToEdit.prepTime;
                    servingsInput.value = recipeToEdit.servings;
                    ingredientsInput.value = recipeToEdit.ingredients.join('\n');
                    instructionsInput.value = recipeToEdit.instructions;
                    editRecipeIdInput.value = recipeToEdit.id;
                    recipeCategorySelect.value = recipeToEdit.category; // Setze Kategorie im Dropdown


                    addRecipeBtn.style.display = 'none';
                    updateRecipeBtn.style.display = 'inline-block';
                    cancelEditBtn.style.display = 'inline-block';

                    recipeNameInput.scrollIntoView({ behavior: 'smooth' });
                }
            });

            li.querySelector('.delete-recipe-btn').addEventListener('click', (event) => {
                if (confirm('Möchtest du dieses Rezept wirklich löschen?')) {
                    const recipeId = parseInt(event.target.dataset.id);
                    recipes = recipes.filter(r => r.id !== recipeId);
                    saveRecipes();
                    renderRecipes();
                    renderShoppingListSelection();
                    resetRecipeForm();
                }
            });

            recipesUl.appendChild(li);
        });
    }

    // --- Einkaufszettel Funktionen ---
    function renderShoppingListSelection() {
        shoppingListSelectionDiv.innerHTML = '';
        if (recipes.length === 0) {
            shoppingListSelectionDiv.textContent = 'Keine Rezepte zum Auswählen vorhanden.';
            return;
        }

        recipes.forEach(recipe => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = recipe.id;
            checkbox.classList.add('shopping-list-recipe-checkbox');

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(recipe.name));
            shoppingListSelectionDiv.appendChild(label);
        });
    }

    function renderShoppingList() {
        shoppingListDiv.innerHTML = '';
        if (currentShoppingListItems.length === 0) {
            shoppingListDiv.textContent = 'Der Einkaufszettel ist leer.';
            return;
        }

        const ul = document.createElement('ul');
        currentShoppingListItems.forEach(item => {
            const li = document.createElement('li');
            li.setAttribute('data-id', item.id);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.checked;
            checkbox.addEventListener('change', () => {
                item.checked = checkbox.checked;
                li.classList.toggle('checked', item.checked);
                saveShoppingList();
            });

            const span = document.createElement('span');
            span.textContent = item.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.style.backgroundColor = '#dc3545';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.style.padding = '3px 8px';
            deleteBtn.style.fontSize = '0.8em';
            deleteBtn.style.marginTop = '0';
            deleteBtn.addEventListener('click', () => {
                currentShoppingListItems = currentShoppingListItems.filter(i => i.id !== item.id);
                saveShoppingList();
                renderShoppingList();
            });

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(deleteBtn);

            if (item.checked) {
                li.classList.add('checked');
            }
            ul.appendChild(li);
        });
        shoppingListDiv.appendChild(ul);
    }

    generateShoppingListBtn.addEventListener('click', () => {
        const selectedRecipeIds = Array.from(document.querySelectorAll('.shopping-list-recipe-checkbox:checked'))
                                       .map(checkbox => parseInt(checkbox.value));

        if (selectedRecipeIds.length === 0) {
            alert('Bitte wählen Sie mindestens ein Rezept für den Einkaufszettel aus!');
            return;
        }

        const tempShoppingList = {};

        selectedRecipeIds.forEach(id => {
            const recipe = recipes.find(r => r.id === id);
            if (recipe) {
                const targetServings = parseInt(servingsInput.value);
                const scaleFactor = targetServings / recipe.servings;

                recipe.ingredients.forEach(ingredientLine => {
                    const match = ingredientLine.match(/^([\d\.,]+\s*(g|ml|l|kg|EL|TL|Stk|Tasse|Bund|Prise)?)\s*(.*)/i);
                    let quantityStr = '';
                    let unit = '';
                    let item = ingredientLine.trim();

                    if (match) {
                        quantityStr = match[1].replace(',', '.').trim();
                        unit = match[2] ? match[2].toLowerCase() : '';
                        item = match[3].trim();
                    }

                    let quantity = parseFloat(quantityStr) || 0;

                    if (quantity > 0 && scaleFactor !== 1) {
                        quantity = quantity * scaleFactor;
                        if (quantity % 1 !== 0) {
                             quantity = parseFloat(quantity.toFixed(2));
                        }
                    }

                    const normalizedItem = item.toLowerCase();

                    if (!tempShoppingList[normalizedItem]) {
                        tempShoppingList[normalizedItem] = {
                            totalQuantity: 0,
                            unit: unit,
                            originalLines: []
                        };
                    }

                    if (tempShoppingList[normalizedItem].unit === unit || (!unit && !tempShoppingList[normalizedItem].unit)) {
                         tempShoppingList[normalizedItem].totalQuantity += quantity;
                    } else {
                        tempShoppingList[normalizedItem].originalLines.push(ingredientLine.trim());
                    }

                    let displayQuantity = quantity > 0 ? (quantity + (unit ? ' ' + unit : '')) : '';
                    if (quantity > 0) {
                        tempShoppingList[normalizedItem].originalLines.push((displayQuantity + ' ' + item).trim());
                    } else {
                         tempShoppingList[normalizedItem].originalLines.push(ingredientLine.trim());
                    }
                });
            }
        });

        for (const item in tempShoppingList) {
            const currentItem = tempShoppingList[item];
            let ingredientText = '';
            if (currentItem.totalQuantity > 0) {
                ingredientText = `${currentItem.totalQuantity}${currentItem.unit ? ' ' + currentItem.unit : ''} ${item}`;
            } else {
                ingredientText = [...new Set(currentItem.originalLines)].join('; ');
            }

            const existingItem = currentShoppingListItems.find(i => i.name.toLowerCase() === ingredientText.toLowerCase());
            if (!existingItem) {
                currentShoppingListItems.push({
                    id: Date.now() + Math.random(),
                    name: ingredientText,
                    checked: false
                });
            }
        }
        saveShoppingList();
        renderShoppingList();
    });

    addManualIngredientBtn.addEventListener('click', () => {
        const item = manualIngredientItemInput.value.trim();
        if (item) {
            currentShoppingListItems.push({
                id: Date.now() + Math.random(),
                name: item,
                checked: false
            });
            manualIngredientItemInput.value = '';
            saveShoppingList();
            renderShoppingList();
        } else {
            alert('Bitte geben Sie eine Zutat ein, die Sie hinzufügen möchten!');
        }
    });

    clearShoppingListBtn.addEventListener('click', () => {
        if (confirm('Möchtest du den gesamten Einkaufszettel leeren?')) {
            currentShoppingListItems = [];
            saveShoppingList();
            renderShoppingList();
        }
    });

    // --- Event Listener für den Button zum Prüfen auf Allergene ---
    allergenCheckBtn.addEventListener('click', () => {
        const selectedRecipe = getSelectedRecipe();
        if (selectedRecipe) {
            const ingredientsText = selectedRecipe.ingredients.join(', ');
            const encodedIngredients = encodeURIComponent(ingredientsText);
            const allergenCheckUrl = `${ALLERGEN_CHECK_URL}?ingredients=${encodedIngredients}`;

            navigator.clipboard.writeText(ingredientsText)
                .then(() => {
                    console.log('Zutaten in die Zwischenablage kopiert. Öffne URL: ' + allergenCheckUrl);
                    window.open(allergenCheckUrl, '_blank');
                })
                .catch(err => {
                    console.error('Fehler beim Kopieren in die Zwischenablage: ', err);
                    console.log('Öffne URL ohne Kopieren: ' + allergenCheckUrl);
                    window.open(allergenCheckUrl, '_blank');
                });
        } else {
            alert('Bitte wählen Sie ein Rezept aus, um die Allergene zu prüfen!');
        }
    });

    // --- Hilfsfunktion, um das ausgewählte Rezept zu ermitteln ---
    function getSelectedRecipe() {
        const selectedCheckboxes = document.querySelectorAll('.shopping-list-recipe-checkbox:checked');
        if (selectedCheckboxes.length === 1) {
            const selectedRecipeId = parseInt(selectedCheckboxes[0].value);
            return recipes.find(r => r.id === selectedRecipeId);
        }
        return null;
    }

    // --- Event Listener für Suche und Filter ---
    searchInput.addEventListener('input', renderRecipes);
    filterCategorySelect.addEventListener('change', renderRecipes);

    // --- Event Listener für Import/Export ---
    importRecipesBtn.addEventListener('click', () => {
        const jsonData = importExportTextarea.value.trim();
        try {
            const importedRecipes = JSON.parse(jsonData);
            if (Array.isArray(importedRecipes)) {
                recipes = recipes.concat(importedRecipes);
                saveRecipes();
                renderRecipes();
                renderShoppingListSelection();
                alert(`${importedRecipes.length} Rezepte importiert!`);
            } else {
                alert('Ungültige Daten: Bitte stellen Sie ein Array von Rezepten im JSON-Format bereit.');
            }
        } catch (error) {
            alert('Fehler beim Importieren der Rezepte.  Stellen Sie sicher, dass das JSON-Format korrekt ist.');
            console.error(error);
        }
        importExportTextarea.value = '';
    });

    exportRecipesBtn.addEventListener('click', () => {
        if (recipes.length === 0) {
            alert('Keine Rezepte zum Exportieren vorhanden!');
            return;
        }
        const jsonData = JSON.stringify(recipes, null, 2);
        importExportTextarea.value = jsonData;
        alert('Rezepte in das Textfeld kopiert. Sie können sie jetzt kopieren und speichern.');
    });

    // --- Initialisierung beim Laden der Seite ---
    loadRecipes();
    loadShoppingList();
});


