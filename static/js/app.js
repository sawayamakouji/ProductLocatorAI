document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/sw.js');
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const scanBtn = document.getElementById('scanBtn');
    const results = document.getElementById('results');

    function showLoading(isAiSearch = false) {
    results.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">検索中...</span>
            </div>
            <p class="mt-2">${isAiSearch ? 'AI分析中...' : '検索中...'}</p>
        </div>
    `;
}

async function performSearch(query, type = 'name', isAiSearch = false) {
        showLoading(isAiSearch);
        try {
            const endpoint = isAiSearch ? '/api/ai_search' : '/api/search';
            const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&type=${type}`);
            const { total_count, products } = await response.json();
            
            results.innerHTML = '';
            
            // 50件以上の場合の警告表示
            if (total_count > 50) {
                results.innerHTML = `
                    <div class="alert alert-info mb-3">
                        <h5 class="alert-heading">検索結果が多すぎます（${total_count}件）</h5>
                        <p>以下の方法で絞り込むことができます：</p>
                        <ul>
                            <li>カテゴリ: ${Array.from(new Set(products.map(p => p.category))).join(', ')}</li>
                            <li>部門: ${Array.from(new Set(products.map(p => p.department))).join(', ')}</li>
                            <li>サブカテゴリ: ${Array.from(new Set(products.map(p => p.subcategory))).filter(Boolean).join(', ')}</li>
                        </ul>
                        <hr>
                        <p class="mb-0">ヒント: 商品の特徴や用途を含めて検索すると、より正確な結果が得られます。</p>
                    </div>
                `;
            }

            // 検索結果の表示
            // AI分析結果の表示
            if (isAiSearch && products[0] && products[0].ai_analysis) {
                try {
                    const aiData = typeof products[0].ai_analysis === 'string' 
                        ? JSON.parse(products[0].ai_analysis) 
                        : products[0].ai_analysis;
                        
                    // データチェックを追加
                    const keywords = Array.isArray(aiData.keywords) ? aiData.keywords : [];
                    const features = aiData.features || '商品の特徴情報はありません';
                    const suggestions = aiData.suggestions || '関連商品の提案はありません';

                    results.innerHTML += `
                        <div class="card mb-3 bg-dark">
                            <div class="card-body">
                                <h5 class="card-title">AI分析結果</h5>
                                <div class="mb-2">
                                    <h6 class="card-subtitle mb-1">関連キーワード</h6>
                                    <p class="card-text">${keywords.map(k => `<span class="badge bg-info me-1">${k}</span>`).join('')}</p>
                                </div>
                                <div class="mb-2">
                                    <h6 class="card-subtitle mb-1">商品の特徴</h6>
                                    <p class="card-text">${features}</p>
                                </div>
                                <div class="mb-2">
                                    <h6 class="card-subtitle mb-1">おすすめ商品</h6>
                                    <p class="card-text">${suggestions}</p>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (e) {
                    console.error('AI分析結果の処理エラー:', e);
                    results.innerHTML += `
                        <div class="alert alert-warning">
                            <p>AI分析結果の処理中にエラーが発生しました。</p>
                            <p>通常の検索結果は以下に表示されます。</p>
                        </div>
                    `;
                }
            }

            // 商品一覧の表示
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
