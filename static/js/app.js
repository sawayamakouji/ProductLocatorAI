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

                    if (aiData.error) {
                        results.innerHTML += `
                            <div class="alert alert-warning">
                                <p>${aiData.error}</p>
                            </div>
                        `;
                        return;
                    }

                    const { user_intent, recommendations, product_features, trend_analysis } = aiData;

                    results.innerHTML += `
                        <div class="card mb-3 bg-dark">
                            <div class="card-header">
                                <h5 class="mb-0">AI分析結果</h5>
                            </div>
                            <div class="card-body">
                                <div class="accordion" id="aiAnalysisAccordion">
                                    <!-- ユーザー意図分析 -->
                                    <div class="accordion-item bg-dark">
                                        <h2 class="accordion-header">
                                            <button class="accordion-button bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#userIntent">
                                                ユーザー意図分析
                                            </button>
                                        </h2>
                                        <div id="userIntent" class="accordion-collapse collapse show" data-bs-parent="#aiAnalysisAccordion">
                                            <div class="accordion-body">
                                                <p><strong>目的：</strong> ${user_intent.purpose}</p>
                                                <p><strong>使用シーン：</strong> ${user_intent.scene}</p>
                                                <p><strong>重視ポイント：</strong></p>
                                                <div>${user_intent.important_features.map(f => `<span class="badge bg-info me-1">${f}</span>`).join('')}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 商品提案 -->
                                    <div class="accordion-item bg-dark">
                                        <h2 class="accordion-header">
                                            <button class="accordion-button bg-dark text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#recommendations">
                                                商品提案
                                            </button>
                                        </h2>
                                        <div id="recommendations" class="accordion-collapse collapse" data-bs-parent="#aiAnalysisAccordion">
                                            <div class="accordion-body">
                                                <div class="mb-3">
                                                    <h6>メイン商品</h6>
                                                    <ul class="list-unstyled">
                                                        ${recommendations.main_products.map(p => `<li><span class="badge bg-primary">${p}</span></li>`).join('')}
                                                    </ul>
                                                </div>
                                                <div class="mb-3">
                                                    <h6>関連商品</h6>
                                                    <ul class="list-unstyled">
                                                        ${recommendations.related_products.map(p => `<li><span class="badge bg-secondary">${p}</span></li>`).join('')}
                                                    </ul>
                                                </div>
                                                <div class="mb-3">
                                                    <h6>セット購入おすすめ</h6>
                                                    <ul class="list-unstyled">
                                                        ${recommendations.bundle_suggestions.map(p => `<li><span class="badge bg-info">${p}</span></li>`).join('')}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 商品特徴 -->
                                    <div class="accordion-item bg-dark">
                                        <h2 class="accordion-header">
                                            <button class="accordion-button bg-dark text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#features">
                                                商品特徴
                                            </button>
                                        </h2>
                                        <div id="features" class="accordion-collapse collapse" data-bs-parent="#aiAnalysisAccordion">
                                            <div class="accordion-body">
                                                <div class="mb-3">
                                                    <h6>主な用途</h6>
                                                    <ul class="list-unstyled">
                                                        ${product_features.main_uses.map(u => `<li>${u}</li>`).join('')}
                                                    </ul>
                                                </div>
                                                <div class="mb-3">
                                                    <h6>おすすめポイント</h6>
                                                    <ul class="list-unstyled">
                                                        ${product_features.highlights.map(h => `<li>${h}</li>`).join('')}
                                                    </ul>
                                                </div>
                                                <div class="mb-3">
                                                    <h6>保管方法</h6>
                                                    <p>${product_features.storage_tips}</p>
                                                </div>
                                                <div class="mb-3">
                                                    <h6>使用上の注意点</h6>
                                                    <p>${product_features.usage_notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- トレンド分析 -->
                                    <div class="accordion-item bg-dark">
                                        <h2 class="accordion-header">
                                            <button class="accordion-button bg-dark text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#trends">
                                                トレンド分析
                                            </button>
                                        </h2>
                                        <div id="trends" class="accordion-collapse collapse" data-bs-parent="#aiAnalysisAccordion">
                                            <div class="accordion-body">
                                                <p><strong>季節性：</strong> ${trend_analysis.seasonality}</p>
                                                <p><strong>人気の組み合わせ：</strong></p>
                                                <ul class="list-unstyled">
                                                    ${trend_analysis.popular_combinations.map(c => `<li><span class="badge bg-success">${c}</span></li>`).join('')}
                                                </ul>
                                                <p><strong>最適な使用時期：</strong> ${trend_analysis.best_timing}</p>
                                            </div>
                                        </div>
                                    </div>
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
