import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import or_

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
            'name': p.name,
            'location': p.location,
            'jan_code': p.jan_code,
            'description': p.description,
            'department': p.department,
            'category': p.category,
            'subcategory': p.subcategory
        } for p in products]
    })

with app.app_context():
    db.create_all()
