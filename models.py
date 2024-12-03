from app import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    jan_code = db.Column(db.String(13), unique=True, index=True)
    location = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    department = db.Column(db.String(100))  # 部門名
    category = db.Column(db.String(100))    # カテゴリ名
    subcategory = db.Column(db.String(100)) # サブカテゴリ名
    stock_quantity = db.Column(db.Integer, default=0)  # 在庫数
    recent_sales = db.Column(db.Integer, default=0)    # 直近の販売数
    revenue = db.Column(db.Float, default=0.0)         # 売上高
    next_shipment = db.Column(db.Integer, default=0)   # 入荷予定数
    ai_keywords = db.Column(db.Text)  # AI生成されたキーワード
    ai_description = db.Column(db.Text)  # AI生成された商品説明

    def __repr__(self):
        return f'<Product {self.name}>'

class SearchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(500), nullable=False)
    ai_enhanced_query = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    results_count = db.Column(db.Integer)
    is_ai_search = db.Column(db.Boolean, default=False)
