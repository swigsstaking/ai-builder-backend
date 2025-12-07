#!/bin/bash

echo "💣 RESET NUCLÉAIRE DE PM2 - Tout nettoyer et redémarrer"
echo ""

# Sauvegarder la liste actuelle
echo "📋 Processus actuels:"
pm2 list

echo ""
echo "⏹️  Arrêt de TOUS les processus..."
pm2 delete all 2>/dev/null

echo "🔪 Kill du daemon PM2..."
pm2 kill

echo "⏳ Attente 3 secondes..."
sleep 3

echo ""
echo "🚀 Redémarrage de TOUS les services..."

# Backend CMS
cd ~/swigs-apps/swigs-cms-backend
echo "▶️  swigs-cms-backend..."
pm2 start npm --name "swigs-cms-backend" -- start

# Monitoring API
cd ~/swigs-apps/swigs-monitoring-api
echo "▶️  swigs-monitoring-api..."
pm2 start npm --name "swigs-monitoring-api" -- start

# Monitoring Agent
cd ~/swigs-apps/swigs-monitoring-agent
echo "▶️  swigs-monitoring-agent..."
pm2 start npm --name "swigs-monitoring-agent" -- start

# Sauvegarder la config
pm2 save

echo ""
echo "⏳ Attente démarrage (5 secondes)..."
sleep 5

echo ""
echo "📋 Nouveaux processus (doivent être ID 0, 1, 2):"
pm2 list

echo ""
echo "📜 Logs backend:"
pm2 logs swigs-cms-backend --lines 15 --nostream

echo ""
echo "✅ Reset terminé !"
echo ""
echo "🔍 Pour suivre les logs CORS:"
echo "  pm2 logs swigs-cms-backend | grep CORS"
