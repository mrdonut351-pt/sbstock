document.addEventListener('DOMContentLoaded', function() {
    const translations = {
        en: {
            title: "MRDONUT INVENTORY",
            searchPlaceholder: "Search by name...",
            sortDefault: "Default",
            sortLowHigh: "Low-High",
            sortHighLow: "High-Low",
            filterSize: "Filter by Size",
            availableSizes: "Available Sizes:",
            noResults: "No matching items found",
            reset: "Reset Filters",
            footer: "MRDONUT Inventory"
        },
        pt: {
            title: "MRDONUT INVENTORY",
            searchPlaceholder: "Pesquisar pelo nome...",
            sortDefault: "Padrão",
            sortLowHigh: "Menor-Maior",
            sortHighLow: "Maior-Menor",
            filterSize: "Filtrar por Tamanho",
            availableSizes: "Tamanhos Disponíveis:",
            noResults: "Nenhum item encontrado",
            reset: "Redefinir Filtros",
            footer: "MRDONUT Inventory"
        }
    };

    let currentLanguage = 'en';
    let allItems = [];
    let selectedSizes = [];
    let currentSort = 'default';
    let currentFilteredItems = null;

    function init() {
        document.getElementById('year').textContent = new Date().getFullYear();
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang.startsWith('pt')) switchLanguage('pt');
        else switchLanguage('en');

        setupEventListeners();
        // Botão toggle do idioma no mobile
const langToggle = document.querySelector('.lang-toggle');
const langPopup = document.getElementById('lang-popup');

if (langToggle) {
  langToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    langPopup.style.display = langPopup.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', () => {
    langPopup.style.display = 'none';
  });
}


        loadDataWithRetry(5);
    }

    function switchLanguage(lang) {
        currentLanguage = lang;
        document.querySelector('h1').textContent = translations[lang].title;
        document.getElementById('search').placeholder = translations[lang].searchPlaceholder;
        document.getElementById('sort-default').innerHTML = `<i class="fas fa-bars"></i> ${translations[lang].sortDefault}`;
        document.getElementById('sort-price-asc').innerHTML = `<i class="fas fa-sort-amount-up"></i> ${translations[lang].sortLowHigh}`;
        document.getElementById('sort-price-desc').innerHTML = `<i class="fas fa-sort-amount-down"></i> ${translations[lang].sortHighLow}`;
        document.getElementById('size-filter-toggle').innerHTML = `<i class="fas fa-filter"></i> ${translations[lang].filterSize}`;
        document.querySelector('#no-results p').textContent = translations[lang].noResults;
        document.getElementById('reset-filters').textContent = translations[lang].reset;
        document.querySelector('footer p').innerHTML = `© <span id="year"></span> ${translations[lang].footer}`;
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`lang-${lang}`).classList.add('active');

        if (allItems.length > 0) sortItems(currentSort);
    }

    async function loadDataWithRetry(maxAttempts) {
        let attempt = 0;
        let success = false;
        while (attempt < maxAttempts && !success) {
            attempt++;
            try { 
                await loadData(); 
                success = true; 
            } catch (error) { 
                console.error(`Attempt ${attempt} failed:`, error);
            }
        }
    }

    async function loadData() {
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyKIQTG9yYvLBiy6eOs7OP3F_rlOW50bR2ZG8DbF0symbvlXTEkiZ_hrwaf4bOs5n2KK6_XXskXhHH/pub?gid=0&single=true&output=csv';
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Erro ao carregar o CSV');
        const csvData = await response.text();
        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true, transform: v => v ? v.trim() : '' });
        allItems = groupItemsBySKU(parsed.data);
        processData();
    }

    function processData() { 
        currentFilteredItems = null; 
        populateSizeFilter();
        sortItems(currentSort); 
        document.getElementById('loading').style.display='none'; 
    }

    function populateSizeFilter() {
        const panel = document.getElementById('size-filter-panel');
        panel.innerHTML = '';
        const allSizes = new Set();
        allItems.forEach(item => item.sizes.forEach(s => allSizes.add(s.size)));
        Array.from(allSizes).sort().forEach(size => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${size}"><span>${size}</span>`;
            panel.appendChild(label);
            label.querySelector('input').addEventListener('change', e => {
                if (e.target.checked) selectedSizes.push(size);
                else selectedSizes = selectedSizes.filter(s => s !== size);
                filterItems();
            });
        });
    }

    function groupItemsBySKU(items) {
        const grouped = {};
        items.forEach(item => {
            if (!item.Name || !item.Size) return;
            const key = item.SKU && item.SKU !== '-' ? `${item.Name}|${item.SKU}` : item.Name;
            if (!grouped[key]) {
                grouped[key] = {
                    name: item.Name,
                    sku: item.SKU || '-',
                    image: item.image_url || 'https://via.placeholder.com/300x200?text=No+Image',
                    price: item['Price + ship'] || 'N/A',
                    sizes: []
                };
            }
            const sizeExists = grouped[key].sizes.find(s => s.size === item.Size);
            if (sizeExists) sizeExists.quantity += 1;
            else grouped[key].sizes.push({ size: item.Size, quantity: 1 });
        });
        return Object.values(grouped);
    }

   function displayItems(items) {
    const grid = document.getElementById('shoe-grid');
    grid.innerHTML = '';
    if (!items.length) { 
        document.getElementById('no-results').style.display = 'flex'; 
        return; 
    }
    document.getElementById('no-results').style.display = 'none';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shoe-card';
        card.innerHTML = `
            <div class="shoe-image-container">
                <img src="${item.image}" alt="${item.name}" class="shoe-image">
            </div>
            <div class="shoe-info">
                <h2>${item.name}</h2>
                <p class="product-sku">SKU: ${item.sku}</p>
                <div class="product-price">${item.price}</div>
                <div class="sizes-container">
                    <p>${translations[currentLanguage].availableSizes}</p>
                    ${item.sizes.map(s => `<span class="size-badge">${s.size}<span class="size-quantity">(${s.quantity})</span></span>`).join('')}
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

    function sortItems(sortType) {
        currentSort = sortType;
        const itemsToSort = currentFilteredItems || [...allItems];
        let sorted = [...itemsToSort];
        switch(sortType){
            case 'price-asc': sorted.sort((a,b)=>parseFloat(a.price.replace(/[^\d.]/g,'')) - parseFloat(b.price.replace(/[^\d.]/g,''))); break;
            case 'price-desc': sorted.sort((a,b)=>parseFloat(b.price.replace(/[^\d.]/g,'')) - parseFloat(a.price.replace(/[^\d.]/g,''))); break;
        }
        updateActiveSortButton(sortType);
        displayItems(sorted);
    }

    function updateActiveSortButton(sortType) {
        document.querySelectorAll('.sort-btn').forEach(btn=>btn.classList.remove('active'));
        const activeId = sortType==='price-asc'?'sort-price-asc':sortType==='price-desc'?'sort-price-desc':'sort-default';
        document.getElementById(activeId).classList.add('active');
    }

    function setupEventListeners() {
        document.getElementById('search').addEventListener('input', filterItems);
        document.getElementById('reset-filters').addEventListener('click', resetFilters);
        document.getElementById('size-filter-toggle').addEventListener('click', e=>{ 
            e.stopPropagation(); 
            document.getElementById('size-filter-panel').classList.toggle('show'); 
        });
        document.getElementById('lang-en').addEventListener('click',()=>switchLanguage('en'));
        document.getElementById('lang-pt').addEventListener('click',()=>switchLanguage('pt'));
        document.getElementById('sort-default').addEventListener('click',()=>sortItems('default'));
        document.getElementById('sort-price-asc').addEventListener('click',()=>sortItems('price-asc'));
        document.getElementById('sort-price-desc').addEventListener('click',()=>sortItems('price-desc'));
    }

    function filterItems() {
        const term = document.getElementById('search').value.toLowerCase();
        currentFilteredItems = allItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
            const matchesSize = selectedSizes.length === 0 || selectedSizes.some(s => item.sizes.some(size => size.size === s));
            return matchesSearch && matchesSize;
        });
        sortItems(currentSort);
    }

    function resetFilters() {
        document.getElementById('search').value = '';
        selectedSizes = [];
        currentFilteredItems = null;
        sortItems('default');
    }

    init();
});
