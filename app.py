import os
import os
import google.generativeai as genai

# Gemini APIの初期化
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')
import google.generativeai as genai
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import or_

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

from models import Product

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'name')
    
    if search_type == 'jan':
        # JANコードの部分一致検索
        query_filter = Product.jan_code.ilike(f'%{query}%')
    else:
        query_filter = or_(
            Product.name.ilike(f'%{query}%'),
            Product.description.ilike(f'%{query}%'),
            Product.jan_code.ilike(f'%{query}%')  # JANコードも検索対象に追加
        )

    # 総件数を取得
    total_count = Product.query.filter(query_filter).count()
    
    # 最初の20件のみ取得
    products = Product.query.filter(query_filter).limit(20).all()
    
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
    })

@app.route('/api/product/<int:product_id>/inventory')
def get_product_inventory(product_id):
    product = Product.query.get_or_404(product_id)
    
    # 現時点ではダミーデータを返す
    inventory_data = {
        'id': product.id,
        'name': product.name,
        'stock_quantity': product.stock_quantity or 50,  # ダミーデータ
        'recent_sales': product.recent_sales or 30,      # ダミーデータ
        'revenue': product.revenue or 15000,             # ダミーデータ
        'next_shipment': product.next_shipment or 100,   # ダミーデータ
        'last_updated': '2024-12-03 13:00:00'           # ダミーデータ
    }
@app.route('/api/ai_search')
def ai_search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': '検索クエリが必要です'}), 400

    try:
        # Gemini APIを使用してクエリを分析
        prompt = f"""
        以下の検索クエリに基づいて、商品検索のための分析を行ってください。
        検索クエリ: {query}

        以下の観点で分析し、JSON形式で結果を返してください：
        1. キーワード抽出：検索に使用する重要なキーワード
        2. カテゴリ推測：関連する可能性のある商品カテゴリ
        3. 商品の特徴：想定される商品の特徴や用途
        4. 代替提案：類似の商品や関連商品の提案

        結果は以下の形式で返してください：
        {{
            "keywords": ["キーワード1", "キーワード2", ...],
            "categories": ["カテゴリ1", "カテゴリ2", ...],
            "features": "商品の特徴や用途の説明",
            "suggestions": "代替商品や関連商品の提案",
            "enhanced_query": "改善された検索クエリ"
        }}
        """
        
        try:
            response = model.generate_content(prompt)
            ai_analysis = response.text
        except Exception as e:
            print(f"Gemini APIエラー: {str(e)}")
            return jsonify({'error': 'AI分析中にエラーが発生しました。通常検索をお試しください。'}), 500
        
        try:
            # AIの分析結果を使用して商品を検索
            products = Product.query.filter(
                or_(
                    Product.name.ilike(f'%{query}%'),
                    Product.description.ilike(f'%{query}%'),
                    Product.category.ilike(f'%{query}%'),
                    Product.subcategory.ilike(f'%{query}%')
                )
            ).limit(20).all()
            
            # 検索ログを保存
            search_log = SearchLog(
                query=query,
                ai_enhanced_query=ai_analysis,
                results_count=len(products),
                is_ai_search=True
            )
            db.session.add(search_log)
            db.session.commit()
        except Exception as e:
            print(f"データベースエラー: {str(e)}")
            return jsonify({'error': 'データベースの操作中にエラーが発生しました'}), 500
        
        return jsonify({
            'products': [{
                'id': p.id,
                'name': p.name,
                'location': p.location,
                'jan_code': p.jan_code,
                'department': p.department,
                'category': p.category,
                'subcategory': p.subcategory,
                'ai_analysis': ai_analysis
            } for p in products],
            'ai_analysis': ai_analysis
        })
        
    except Exception as e:
        print(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました。しばらく待ってから再度お試しください。'}), 500
    
    return jsonify(inventory_data)

with app.app_context():
    db.create_all()
