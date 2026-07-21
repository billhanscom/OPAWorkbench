/* OPA Workbench: Phase 1 inventory screen */

(() => {
    "use strict";

    let ingredients = [];
    let potionNames = null;
    let showAllIngredients = false;

    const rarityOrder = ["common", "uncommon", "rare"];
    const potionTypes = ["combat", "utility", "whimsy"];

    function ingredientInventory() {
        return Obojima.loadStoredInventory();
    }

    function quantityForIngredient(name) {
        const quantities = Obojima.loadInventoryQuantities();
        const value = Math.floor(Number(quantities[name]) || 0);
        return value > 0 ? value : 0;
    }

    function potionKey(type, number) {
        return `${type}:${number}`;
    }

    function createQuantityControls({ label, quantity, onDecrease, onIncrease }) {
        const controls = document.createElement("div");
        controls.className = "inventory-inline-controls";

        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "inventory-inline-button";
        minus.textContent = "−";
        minus.setAttribute("aria-label", `Decrease ${label}`);
        minus.disabled = quantity <= 0;
        minus.addEventListener("click", onDecrease);

        const count = document.createElement("span");
        count.className = "inventory-inline-count";
        count.textContent = String(quantity);
        count.setAttribute("aria-label", `${label} quantity ${quantity}`);

        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "inventory-inline-button";
        plus.textContent = "+";
        plus.setAttribute("aria-label", `Increase ${label}`);
        plus.addEventListener("click", onIncrease);

        controls.append(minus, count, plus);
        return controls;
    }

    function createInventoryRow(name, quantity, handlers, extraClass = "") {
        const row = document.createElement("div");
        row.className = `inventory-compact-row${quantity > 0 ? " is-owned" : ""}${extraClass ? ` ${extraClass}` : ""}`;

        const itemName = document.createElement("span");
        itemName.className = "inventory-compact-name";
        itemName.textContent = name;

        row.append(
            itemName,
            createQuantityControls({
                label: name,
                quantity,
                onDecrease: handlers.onDecrease,
                onIncrease: handlers.onIncrease
            })
        );
        return row;
    }

    function setIngredientQuantity(name, quantity) {
        const next = Math.max(0, Math.floor(Number(quantity) || 0));
        const inventory = ingredientInventory();
        const quantities = Obojima.loadInventoryQuantities();
        const set = new Set(inventory);

        if (next > 0) {
            set.add(name);
            quantities[name] = next;
        } else {
            set.delete(name);
            delete quantities[name];
        }

        Obojima.saveInventoryQuantities(quantities);
        Obojima.saveStoredInventory(Array.from(set));
        Obojima.updateSaveInventoryButtons(Array.from(set));
        renderIngredients();
        updateTotals();
    }

    function renderIngredients() {
        const inventorySet = new Set(ingredientInventory());
        const targets = {
            common: document.getElementById("common-inventory-list"),
            uncommon: document.getElementById("uncommon-inventory-list"),
            rare: document.getElementById("rare-inventory-list")
        };

        rarityOrder.forEach(rarity => {
            const target = targets[rarity];
            target.innerHTML = "";
            ingredients
                .filter(ingredient => Obojima.normalizeRarity(ingredient.rarity) === rarity)
                .filter(ingredient => showAllIngredients || inventorySet.has(ingredient.name))
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(ingredient => {
                    const quantity = quantityForIngredient(ingredient.name);
                    target.appendChild(createInventoryRow(
                        ingredient.name,
                        quantity,
                        {
                            onDecrease: () => setIngredientQuantity(ingredient.name, quantity - 1),
                            onIncrease: () => setIngredientQuantity(ingredient.name, quantity + 1)
                        },
                        `rarity-${rarity}`
                    ));
                });

            if (!target.children.length) {
                const empty = document.createElement("p");
                empty.className = "inventory-category-empty";
                empty.textContent = showAllIngredients ? "No ingredients in this category." : "None currently owned.";
                target.appendChild(empty);
            }
        });

        const emptyMessage = document.getElementById("ingredient-empty-message");
        emptyMessage.hidden = showAllIngredients || inventorySet.size > 0;
    }

    function potionNameMap(type) {
        return potionNames[`${type}_names`] || {};
    }

    function renderPotions() {
        const inventory = Obojima.loadPotionInventory();

        potionTypes.forEach(type => {
            const target = document.getElementById(`${type}-potion-list`);
            target.innerHTML = "";
            const names = potionNameMap(type);

            Object.keys(names)
                .map(Number)
                .sort((a, b) => a - b)
                .forEach(number => {
                    const key = potionKey(type, number);
                    const quantity = inventory[key] || 0;
                    const label = `${number}. ${names[number]}`;
                    target.appendChild(createInventoryRow(label, quantity, {
                        onDecrease: () => {
                            Obojima.setPotionQuantity(key, quantity - 1);
                            renderPotions();
                            updateTotals();
                        },
                        onIncrease: () => {
                            Obojima.setPotionQuantity(key, quantity + 1);
                            renderPotions();
                            updateTotals();
                        }
                    }, `potion-${type}`));
                });
        });
    }

    function updateTotals() {
        const ingredientQuantities = Obojima.loadInventoryQuantities();
        const potionQuantities = Obojima.loadPotionInventory();
        const ingredientKinds = Object.values(ingredientQuantities).filter(value => Number(value) > 0).length;
        const ingredientCount = Object.values(ingredientQuantities).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
        const potionKinds = Object.values(potionQuantities).filter(value => Number(value) > 0).length;
        const potionCount = Object.values(potionQuantities).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);

        document.getElementById("ingredient-total").textContent = `${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"} across ${ingredientKinds} type${ingredientKinds === 1 ? "" : "s"}`;
        document.getElementById("potion-total").textContent = `${potionCount} potion${potionCount === 1 ? "" : "s"} across ${potionKinds} type${potionKinds === 1 ? "" : "s"}`;
    }

    function rerender() {
        renderPotions();
        renderIngredients();
        updateTotals();
        Obojima.updateInventoryProfileDisplay();
        Obojima.updateSaveInventoryButtons(ingredientInventory());
    }

    window.exportWorkbenchInventory = () => Obojima.exportInventory(ingredientInventory());

    window.importWorkbenchInventory = () => Obojima.importInventoryFile(() => rerender(), () => ingredientInventory());

    window.clearWorkbenchInventory = async () => {
        const result = await Obojima.showClearInventoryDialog();
        if (!result || result.action === "cancel") return;
        if (result.action === "save") {
            const saved = await Obojima.exportInventory(ingredientInventory());
            if (!saved) return;
        }
        Obojima.saveStoredInventory([]);
        Obojima.saveInventoryQuantities({});
        Obojima.savePotionInventory({});
        Obojima.clearInventoryProfile();
        rerender();
    };

    async function init() {
        try {
            [ingredients, potionNames] = await Promise.all([
                Obojima.loadIngredientData(Obojima.getValuesYear()),
                Obojima.loadPotionNames()
            ]);
            document.getElementById("show-all-ingredients").addEventListener("change", event => {
                showAllIngredients = event.currentTarget.checked;
                renderIngredients();
            });
            rerender();
        } catch (error) {
            console.error("Unable to initialize the inventory workbench.", error);
            document.getElementById("inventory-content").innerHTML = '<p class="inventory-page-error">The inventory could not be loaded.</p>';
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
