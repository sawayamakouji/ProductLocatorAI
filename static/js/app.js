document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/sw.js');
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const scanBtn = document.getElementById('scanBtn');
    const results = document.getElementById('results');

    async function performSearch(query, type = 'name') {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
            const data = await response.json();
            
            results.innerHTML = '';
            data.forEach(product => {
                results.innerHTML += `
                    <div class="list-group-item">
                        <h5 class="mb-1">${product.name}</h5>
                        <p class="mb-1">場所: ${product.location}</p>
                        <small>JANコード: ${product.jan_code}</small>
                    </div>
                `;
            });
        } catch (error) {
            console.error('検索エラー:', error);
        }
    }

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
});
