#!/usr/bin/env python3
"""
Run database migrations from within VPC using Lambda or local execution.
"""
import json
import boto3
import psycopg2
import sys
from pathlib import Path

def get_db_credentials():
    """Get database credentials from Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId='outreachpass/dev/database')
    secret = json.loads(response['SecretString'])
    return secret

def run_migration(sql_file_path):
    """Execute SQL migration file."""
    # Get credentials
    creds = get_db_credentials()

    # Read SQL file
    sql_content = Path(sql_file_path).read_text()

    # Connect and execute
    conn = psycopg2.connect(
        host=creds['host'],
        port=creds['port'],
        database=creds['database'],
        user=creds['username'],
        password=creds['password']
    )

    try:
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        print("✅ Migration completed successfully!")

        # Verify tables created
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"\n📋 Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")

        cursor.close()
        return True

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def lambda_handler(event, context):
    """Lambda entry point."""
    # For Lambda, the SQL file will be bundled
    sql_file = '/var/task/001_initial_schema.sql'
    success = run_migration(sql_file)

    return {
        'statusCode': 200 if success else 500,
        'body': json.dumps({
            'message': 'Migration completed' if success else 'Migration failed'
        })
    }

if __name__ == '__main__':
    # For local execution
    sql_file = sys.argv[1] if len(sys.argv) > 1 else '../database/001_initial_schema.sql'
    run_migration(sql_file)
