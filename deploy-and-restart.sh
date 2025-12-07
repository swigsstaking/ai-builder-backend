#!/bin/bash

echo "🚀 Déploiement et redémarrage COMPLET du backend..."

# Arrêter complètement PM2
echo "⏹️  Arrêt de swigs-cms-backend..."
pm2 stop swigs-cms-backend 2>/dev/null
pm2 delete swigs-cms-backend 2>/dev/null

# Vider le cache PM2
echo "🧹 Nettoyage cache PM2..."
pm2 flush

# Attendre
sleep 2

# Redémarrer
echo "▶️  Redémarrage..."
pm2 start npm --name "swigs-cms-backend" -- start

# Attendre le démarrage
sleep 3

# Afficher les logs
echo ""
echo "📋 Logs de démarrage:"
pm2 logs swigs-cms-backend --lines 10 --nostream

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "Pour suivre les logs en temps réel:"
echo "  pm2 logs swigs-cms-backend"
