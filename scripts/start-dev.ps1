# Script de démarrage Windows — Assurances Oued Zem
Write-Host "🚀 Démarrage dev — Assurances Oued Zem" -ForegroundColor Cyan

# Copy env files
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "✅ .env créé" }
if (-not (Test-Path "backend\.env")) { Copy-Item "backend\.env.example" "backend\.env"; Write-Host "✅ backend\.env créé" }

# Start infrastructure
Write-Host "`n⚙️  Démarrage infrastructure..." -ForegroundColor Yellow
docker compose up -d postgres redis minio

# Wait for postgres
Write-Host "⏳ Attente de PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Prisma
Write-Host "`n📦 Migrations Prisma..." -ForegroundColor Yellow
Set-Location backend
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
Set-Location ..

Write-Host "`n✅ Infrastructure prête!" -ForegroundColor Green
Write-Host ""
Write-Host "Démarrez maintenant:" -ForegroundColor Cyan
Write-Host "  Backend:  cd backend && npm run start:dev"
Write-Host "  Frontend: cd frontend && npm run dev"
Write-Host ""
Write-Host "URLs:"
Write-Host "  Frontend:  http://localhost:3000"
Write-Host "  API:       http://localhost:3001/api/v1"
Write-Host "  Swagger:   http://localhost:3001/api/docs"
Write-Host "  MinIO:     http://localhost:9001 (minioadmin/minioadmin123)"
Write-Host ""
Write-Host "Admin: admin@assurancesoueedzem.ma / Admin@2024!" -ForegroundColor Green
