import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import or_
import google.generativeai as genai

# Gemini APIの設定
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

from models import Product, SearchLog

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    try:
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'name')
        
        if search_type == 'jan':
            query_filter = Product.jan_code.ilike(f'%{query}%')
        else:
            query_filter = or_(
                Product.name.ilike(f'%{query}%'),
                Product.description.ilike(f'%{query}%'),
                Product.jan_code.ilike(f'%{query}%')
            )

        total_count = Product.query.filter(query_filter).count()
        products = Product.query.filter(query_filter).limit(50).all()
        
        return jsonify({
            'total_count': total_count,
            'products': [{
                'id': p.id,
                'name': p.name,
                'location': p.location,
                'jan_code': p.jan_code,
                'description': p.description,
                'department': p.department,
                'category': p.category,
                'subcategory': p.subcategory
            } for p in products]
        }), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"検索エラー: {str(e)}")
        return jsonify({
            'error': '検索中にエラーが発生しました',
            'details': str(e)
        }), 500, {'Content-Type': 'application/json'}

@app.route('/api/product/<int:product_id>/inventory')
def get_product_inventory(product_id):
    product = Product.query.get_or_404(product_id)
    
    inventory_data = {
        'id': product.id,
        'name': product.name,
        'stock_quantity': product.stock_quantity or 50,
        'recent_sales': product.recent_sales or 30,
        'revenue': product.revenue or 15000,
        'next_shipment': product.next_shipment or 100,
        'last_updated': '2024-12-03 13:00:00',
        'sales_copy': product.sales_copy or '期間限定！今だけお買い得',
        'coupon_info': product.coupon_info or 'LINE友だち登録で100円OFF',
        'special_offer': product.special_offer or 'ポイント2倍'
    }
    
    return jsonify(inventory_data)

@app.route('/api/ai_search')
def ai_search():
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 60
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': '検索クエリが必要です'}), 400

    try:
        prompt = f'''
与えられた検索クエリ「{query}」に基づいて、以下の分析を行ってください：

1. ユーザーの意図分析：
- 探している商品の種類や目的
- 想定される使用シーン
- 重視している特徴（価格帯、品質、ブランドなど）

2. 商品提案：
- メインカテゴリの商品
- 関連する周辺商品
- 代替商品の提案
- セット購入におすすめの商品

3. 商品特徴：
- 主な用途と特徴
- おすすめのポイント
- 類似商品との違い
- 保管方法や使用上の注意点

4. トレンド分析：
- 季節性
- 人気の組み合わせ
- 使用時期や場面

以下のJSON形式で結果を返してください：
{{
    "user_intent": {{
        "purpose": "使用目的",
        "scene": "使用シーン",
        "important_features": ["重視ポイント1", "重視ポイント2"]
    }},
    "recommendations": {{
        "main_products": ["商品1", "商品2"],
        "related_products": ["関連商品1", "関連商品2"],
        "alternatives": ["代替品1", "代替品2"],
        "bundle_suggestions": ["セット商品1", "セット商品2"]
    }},
    "product_features": {{
        "main_uses": ["用途1", "用途2"],
        "highlights": ["ポイント1", "ポイント2"],
        "storage_tips": "保管方法",
        "usage_notes": "使用上の注意点"
    }},
    "trend_analysis": {{
        "seasonality": "季節性",
        "popular_combinations": ["組み合わせ1", "組み合わせ2"],
        "best_timing": "最適な使用時期"
    }},
    "enhanced_query": "改善された検索クエリ"
}}
'''

        try:
            response = model.generate_content(prompt)
            ai_analysis = response.text
            try:
                import json
                ai_analysis = json.loads(ai_analysis)
            except json.JSONDecodeError:
                ai_analysis = {
                    "user_intent": {
                        "purpose": "目的を取得できませんでした",
                        "scene": "シーンを取得できませんでした",
                        "important_features": []
                    },
                    "recommendations": {
                        "main_products": [],
                        "related_products": [],
                        "alternatives": [],
                        "bundle_suggestions": []
                    },
                    "product_features": {
                        "main_uses": [],
                        "highlights": [],
                        "storage_tips": "保管方法を取得できませんでした",
                        "usage_notes": "使用上の注意点を取得できませんでした"
                    },
                    "trend_analysis": {
                        "seasonality": "季節性を取得できませんでした",
                        "popular_combinations": [],
                        "best_timing": "使用時期を取得できませんでした"
                    },
                    "enhanced_query": query
                }
        except Exception as e:
            print(f"Gemini APIエラー: {str(e)}")
            ai_analysis = {
                "error": "AI分析中にエラーが発生しました",
                "enhanced_query": query
            }

        products = Product.query.filter(
            or_(
                Product.name.ilike(f'%{query}%'),
                Product.description.ilike(f'%{query}%'),
                Product.category.ilike(f'%{query}%'),
                Product.subcategory.ilike(f'%{query}%')
            )
        ).limit(20).all()

        try:
            search_log = SearchLog(
                query=query,
                ai_enhanced_query=str(ai_analysis),
                results_count=len(products),
                is_ai_search=True
            )
            db.session.add(search_log)
            db.session.commit()
        except Exception as e:
            print(f"検索ログ保存エラー: {str(e)}")
            db.session.rollback()

        return jsonify({
            'products': [{
                'id': p.id,
                'name': p.name,
                'location': p.location,
                'jan_code': p.jan_code,
                'department': p.department,
                'category': p.category,
                'subcategory': p.subcategory
            } for p in products],
            'ai_analysis': ai_analysis
        })

    except Exception as e:
        print(f"予期せぬエラー: {str(e)}")
        return jsonify({
            'error': '予期せぬエラーが発生しました。しばらく待ってから再度お試しください。',
            'details': str(e)
        }), 500

with app.app_context():
    # 既存のテーブルを保持したまま新しいスキーマを適用
    db.create_all()
    
    # テーブルの変更を反映
    from sqlalchemy import text
    with db.engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE product 
                ADD COLUMN IF NOT EXISTS sales_copy VARCHAR(200),
                ADD COLUMN IF NOT EXISTS coupon_info VARCHAR(200),
                ADD COLUMN IF NOT EXISTS special_offer VARCHAR(200)
            """))
            conn.commit()
        except Exception as e:
            print(f"マイグレーションエラー: {str(e)}")
            conn.rollback()
