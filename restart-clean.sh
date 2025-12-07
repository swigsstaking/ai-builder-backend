#!/bin/bash

echo "🔄 Redémarrage complet du backend..."

# Arrêter et supprimer complètement
pm2 stop swigs-cms-backend 2>/dev/null
pm2 delete swigs-cms-backend 2>/dev/null

# Attendre un peu
sleep 2

# Redémarrer proprement
pm2 start npm --name "swigs-cms-backend" -- start

# Afficher les logs
echo ""
echo "✅ Backend redémarré. Logs:"
pm2 logs swigs-cms-backend --lines 15 --nostream

echo ""
echo "Pour suivre les logs en temps réel:"
echo "pm2 logs swigs-cms-backend"
