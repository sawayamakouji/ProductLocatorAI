from app import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    jan_code = db.Column(db.String(13), unique=True)
    location = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
