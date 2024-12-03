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
            const { total_count, products } = await response.json();
            
            results.innerHTML = '';
            
            // 検索結果が20件を超える場合、警告メッセージを表示
            if (total_count > 20) {
                results.innerHTML = `
                    <div class="alert alert-warning mb-3">
                        <h5 class="alert-heading">検索結果が多すぎます（${total_count}件）</h5>
                        <p>より正確な結果を得るために：</p>
                        <ul>
                            <li>より具体的な検索キーワードを使用してください</li>
                            <li>商品名の特徴的な部分で検索してみてください</li>
                            <li>JANコードがわかる場合はバーコードスキャンを使用してください</li>
                        </ul>
                        <hr>
                        <p class="mb-0">検索のヒント：以下の情報も含めて検索できます：</p>
                        <ul>
                            <li>部門名（例：菓子、飲料）</li>
                            <li>カテゴリ名（例：洋菓子、和菓子）</li>
                        </ul>
                    </div>
                `;
            }

            // 検索結果の表示
            products.forEach(product => {
                results.innerHTML += `
                    <div class="list-group-item">
                        <h5 class="mb-1">${product.name}</h5>
                        <p class="mb-1">場所: ${product.location}</p>
                        <p class="mb-1">
                            <span class="badge bg-secondary">${product.department}</span>
                            <span class="badge bg-secondary">${product.category}</span>
                            ${product.subcategory ? `<span class="badge bg-secondary">${product.subcategory}</span>` : ''}
                        </p>
                        <small>JANコード: ${product.jan_code}</small>
                    </div>
                `;
            });
        } catch (error) {
            console.error('検索エラー:', error);
            results.innerHTML = `
                <div class="alert alert-danger">
                    検索中にエラーが発生しました。もう一度お試しください。
                </div>
            `;
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
