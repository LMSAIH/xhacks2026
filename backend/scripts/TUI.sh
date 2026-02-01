#!/bin/bash
# SFU AI Teacher - Cloudflare Infrastructure Setup Script
# Run this script to create all required Cloudflare resources

set -e

echo "🚀 SFU AI Teacher - Infrastructure Setup"
echo "========================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "📋 Checking Wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Wrangler. Please run:"
    echo "   wrangler login"
    exit 1
fi

echo "✅ Wrangler authenticated"
echo ""

# Create D1 Database
echo "📦 Creating D1 Database..."
D1_OUTPUT=$(wrangler d1 create sfu-ai-teacher-db 2>&1) || true
if echo "$D1_OUTPUT" | grep -q "already exists"; then
    echo "ℹ️  D1 database 'sfu-ai-teacher-db' already exists"
else
    echo "$D1_OUTPUT"
    echo "✅ D1 database created"
fi

# Extract D1 database ID
D1_ID=$(wrangler d1 list --json 2>/dev/null | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Database ID: $D1_ID"
echo ""

# Create KV Namespace
echo "📦 Creating KV Namespace..."
KV_OUTPUT=$(wrangler kv namespace create sfu-ai-teacher-kv 2>&1) || true
if echo "$KV_OUTPUT" | grep -q "already exists"; then
    echo "ℹ️  KV namespace already exists"
else
    echo "$KV_OUTPUT"
    echo "✅ KV namespace created"
fi
echo ""

# Create Vectorize Index
echo "📦 Creating Vectorize Index..."
VECTORIZE_OUTPUT=$(wrangler vectorize create sfu-course-index --dimensions=768 --metric=cosine 2>&1) || true
if echo "$VECTORIZE_OUTPUT" | grep -q "already exists"; then
    echo "ℹ️  Vectorize index 'sfu-course-index' already exists"
else
    echo "$VECTORIZE_OUTPUT"
    echo "✅ Vectorize index created"
fi
echo ""

# Create Vectorize metadata indexes
echo "📦 Creating Vectorize Metadata Indexes..."
wrangler vectorize create-metadata-index sfu-course-index --property-name=course_code --type=string 2>&1 || true
wrangler vectorize create-metadata-index sfu-course-index --property-name=content_type --type=string 2>&1 || true
echo "✅ Metadata indexes created"
echo ""

# Run D1 migrations
echo "📦 Running D1 Migrations..."
if [ -f "./sql/schema.sql" ]; then
    wrangler d1 execute sfu-ai-teacher-db --file=./sql/schema.sql 2>&1 || true
    echo "✅ D1 schema applied"
else
    echo "⚠️  sql/schema.sql not found, skipping migration"
fi
echo ""

# Print summary
echo "========================================="
echo "✅ Infrastructure Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update wrangler.jsonc with the correct resource IDs"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "Resource IDs to update in wrangler.jsonc:"
echo "  D1 Database ID: $D1_ID"
echo ""
echo "To get other IDs, run:"
echo "  wrangler kv namespace list"
echo "  wrangler vectorize list"
