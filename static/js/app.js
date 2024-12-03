document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/sw.js');
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const scanBtn = document.getElementById('scanBtn');
    const results = document.getElementById('results');

    async function performSearch(query, type = 'name', isAiSearch = false) {
        try {
            const endpoint = isAiSearch ? '/api/ai_search' : '/api/search';
            const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&type=${type}`);
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
                    <div class="list-group-item product-card" data-product-id="${product.id}">
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
        const isAiSearch = document.getElementById('aiSearch').checked;
        if (query) {
            performSearch(query, 'name', isAiSearch);
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
    // 在庫情報モーダルの追加
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="inventoryModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">商品情報</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="loadingSpinner" class="text-center" style="display: none;">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">読み込み中...</span>
                            </div>
                        </div>
                        <div id="inventoryContent" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </div>
    `);

    // 商品カードのクリックイベントハンドラー
    results.addEventListener('click', async (e) => {
        const productCard = e.target.closest('.product-card');
        if (!productCard) return;

        const productId = productCard.dataset.productId;
        const loadingSpinner = document.getElementById('loadingSpinner');
        const inventoryContent = document.getElementById('inventoryContent');
        
        // モーダルを表示し、ローディング状態を設定
        const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));
        modal.show();
        
        loadingSpinner.style.display = 'block';
        inventoryContent.style.display = 'none';

        try {
            const response = await fetch(`/api/product/${productId}/inventory`);
            if (!response.ok) throw new Error('在庫情報の取得に失敗しました');
            
            const data = await response.json();
            
            inventoryContent.innerHTML = `
                <h6 class="mb-3">${data.name}</h6>
                <div class="row">
                    <div class="col-6 mb-3">
                        <div class="card bg-dark">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">現在庫</h6>
                                <p class="card-text h4">${data.stock_quantity}個</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 mb-3">
                        <div class="card bg-dark">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">直近の販売数</h6>
                                <p class="card-text h4">${data.recent_sales}個</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-dark">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">売上高</h6>
                                <p class="card-text h4">${data.revenue.toLocaleString()}円</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-dark">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">入荷予定</h6>
                                <p class="card-text h4">${data.next_shipment}個</p>
                            </div>
                        </div>
                    </div>
                </div>
                <small class="text-muted">最終更新: ${data.last_updated}</small>
            `;
            
            // データ表示が完了したらローディングを非表示
            loadingSpinner.style.display = 'none';
            inventoryContent.style.display = 'block';
        } catch (error) {
            console.error('在庫情報の取得エラー:', error);
            loadingSpinner.style.display = 'none';
            inventoryContent.innerHTML = `
                <div class="alert alert-danger">
                    在庫情報の取得に失敗しました。もう一度お試しください。
                </div>
            `;
            inventoryContent.style.display = 'block';
        }
    });
