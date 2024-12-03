import json
from app import app, db
from models import Product
from sqlalchemy.dialects.postgresql import insert

def clean_jan_code(code):
    """Clean the JAN code by removing quotes and special characters."""
    if isinstance(code, str):
        return code.strip("'")
    return str(code)

def import_products_from_json(filename, batch_size=100):
    with app.app_context():
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                products = json.load(f)

            success_count = 0
            skip_count = 0
            error_count = 0
            batch = []

            for item in products:
                try:
                    jan_code = clean_jan_code(item['商品コード'])
                    
                    product_data = {
                        'name': item['商品名漢字'],
                        'jan_code': jan_code,
                        'location': f"通路 {item['通路番号']}",
                        'department': item['部門名'],
                        'category': item['カテゴリ名'],
                        'subcategory': item['サブカテゴリ名']
                    }
                    
                    batch.append(product_data)
                    
                    if len(batch) >= batch_size:
                        # Use upsert to handle duplicates
                        stmt = insert(Product).values(batch)
                        stmt = stmt.on_conflict_do_nothing(
                            index_elements=['jan_code']
                        )
                        result = db.session.execute(stmt)
                        db.session.commit()
                        
                        success_count += result.rowcount
                        skip_count += len(batch) - result.rowcount
                        batch = []

                except Exception as e:
                    print(f"Error processing item: {e}")
                    error_count += 1
                    continue

            # Process remaining items
            if batch:
                stmt = insert(Product).values(batch)
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['jan_code']
                )
                result = db.session.execute(stmt)
                db.session.commit()
                
                success_count += result.rowcount
                skip_count += len(batch) - result.rowcount

            return {
                'success': success_count,
                'skipped': skip_count,
                'errors': error_count
            }

        except Exception as e:
            print(f"Fatal error during import: {e}")
            db.session.rollback()
            return None

if __name__ == "__main__":
    result = import_products_from_json('駅前商品の通路番号.json')
    if result:
        print(f"Import completed:")
        print(f"Successfully imported: {result['success']} products")
        print(f"Skipped (already exists): {result['skipped']} products")
        print(f"Errors encountered: {result['errors']} products")
