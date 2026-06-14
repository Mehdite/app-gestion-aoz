#!/bin/bash
set -e

echo "🚀 Démarrage — Assurances Oued Zem"

# Copy env files if they don't exist
[ ! -f .env ] && cp .env.example .env && echo "✅ .env créé"
[ ! -f backend/.env ] && cp backend/.env.example backend/.env && echo "✅ backend/.env créé"

echo ""
echo "⚙️  Démarrage des services Docker..."
docker compose up -d postgres redis minio

echo ""
echo "⏳ Attente de PostgreSQL..."
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL prêt"

echo ""
echo "📦 Migrations Prisma..."
cd backend
npx prisma migrate deploy
npx prisma generate
echo "✅ Base de données migrée"

echo ""
echo "🌱 Initialisation des données..."
npx ts-node prisma/seed.ts
cd ..

echo ""
echo "🎯 Démarrage de l'application complète..."
docker compose up -d

echo ""
echo "✅ Application démarrée!"
echo ""
echo "📱 Frontend:     http://localhost:3000"
echo "🔌 API:          http://localhost:3001/api/v1"
echo "📖 Swagger:      http://localhost:3001/api/docs"
echo "🗄️  MinIO:        http://localhost:9001"
echo ""
echo "🔑 Identifiants admin:"
echo "   Email:    admin@assurancesoueedzem.ma"
echo "   Mot de passe: Admin@2024!"
