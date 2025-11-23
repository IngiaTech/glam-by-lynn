"""Check tables in Neon database"""
from app.core.database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
tables = [row[0] for row in result]
print(f'✓ Found {len(tables)} tables in Neon database:')
for t in tables:
    print(f'  - {t}')
conn.close()
