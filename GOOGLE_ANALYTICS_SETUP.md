# 🔧 Configuration Google Analytics 4

## 📋 Prérequis

1. Compte Google Cloud Platform
2. Compte Google Analytics 4
3. Accès admin au site dans GA4

---

## 🚀 Étape 1 : Créer un Service Account

### 1.1 Google Cloud Console

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Aller dans **IAM & Admin** > **Service Accounts**
4. Cliquer sur **Create Service Account**
5. Remplir :
   - **Name** : `swigs-analytics-reader`
   - **Description** : `Service account pour lire les données GA4`
6. Cliquer sur **Create and Continue**
7. **Rôle** : Aucun rôle nécessaire (on donnera l'accès dans GA4)
8. Cliquer sur **Continue** puis **Done**

### 1.2 Créer une clé JSON

1. Cliquer sur le service account créé
2. Aller dans l'onglet **Keys**
3. Cliquer sur **Add Key** > **Create new key**
4. Choisir **JSON**
5. Télécharger le fichier JSON

### 1.3 Copier le fichier sur le serveur

```bash
# Sur votre machine locale
scp /chemin/vers/service-account.json swigs@192.168.110.73:~/swigs-apps/swigs-cms-backend/

# Sur le serveur
ssh swigs@192.168.110.73
cd ~/swigs-apps/swigs-cms-backend
chmod 600 service-account.json
```

---

## 🔑 Étape 2 : Activer l'API Google Analytics Data

1. Dans Google Cloud Console
2. Aller dans **APIs & Services** > **Library**
3. Chercher **Google Analytics Data API**
4. Cliquer sur **Enable**

---

## 👥 Étape 3 : Donner accès au Service Account dans GA4

### 3.1 Récupérer l'email du Service Account

Dans le fichier JSON téléchargé, chercher `client_email` :
```json
{
  "client_email": "swigs-analytics-reader@project-id.iam.gserviceaccount.com"
}
```

### 3.2 Ajouter dans Google Analytics 4

1. Aller sur [Google Analytics](https://analytics.google.com/)
2. Sélectionner la propriété GA4
3. Cliquer sur **Admin** (roue dentée en bas à gauche)
4. Dans la colonne **Property**, cliquer sur **Property Access Management**
5. Cliquer sur **+** (Add users)
6. Coller l'email du service account
7. Rôle : **Viewer** (lecture seule)
8. Décocher **Notify new users by email**
9. Cliquer sur **Add**

---

## 🔢 Étape 4 : Récupérer le Property ID

1. Dans Google Analytics 4
2. Aller dans **Admin** > **Property Settings**
3. Noter le **Property ID** (format : `123456789`)
4. Le format complet pour l'API est : `properties/123456789`

---

## ⚙️ Étape 5 : Configuration Backend

### 5.1 Variables d'environnement

Ajouter dans `/Users/corentinflaction/CascadeProjects/swigs-cms-backend/.env` :

```bash
# Google Analytics 4
GOOGLE_APPLICATION_CREDENTIALS=/chemin/absolu/vers/service-account.json
```

**Sur le serveur** :
```bash
# Dans ~/swigs-apps/swigs-cms-backend/.env
GOOGLE_APPLICATION_CREDENTIALS=/home/swigs/swigs-apps/swigs-cms-backend/service-account.json
```

### 5.2 Redémarrer le backend

```bash
pm2 restart swigs-cms-backend
pm2 logs swigs-cms-backend --lines 50
```

---

## 🗄️ Étape 6 : Configurer le Site dans MongoDB

### Option A : Via l'Admin (à venir)

Dans Paramètres > Site > Analytics :
- Coller le Property ID : `properties/123456789`

### Option B : Via MongoDB directement

```javascript
// Se connecter à MongoDB
mongosh

use swigs-cms

// Mettre à jour le site (remplacer SITE_ID et PROPERTY_ID)
db.sites.updateOne(
  { _id: ObjectId("SITE_ID") },
  { 
    $set: { 
      "settings.analytics.ga4PropertyId": "properties/123456789" 
    } 
  }
)
```

**Exemple pour GTSALPINA** :
```javascript
db.sites.updateOne(
  { slug: "gtsalpina" },
  { 
    $set: { 
      "settings.analytics.ga4PropertyId": "properties/123456789" 
    } 
  }
)
```

---

## ✅ Étape 7 : Tester l'intégration

### 7.1 Test avec curl

```bash
# Récupérer le token JWT (se connecter à l'admin)
TOKEN="votre_token_jwt"

# Tester l'endpoint overview
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/analytics/ga4/overview?siteId=SITE_ID&days=30"
```

### 7.2 Vérifier les logs

```bash
pm2 logs swigs-cms-backend --lines 100
```

Si tout fonctionne, vous devriez voir :
```json
{
  "success": true,
  "data": {
    "visitors": 12450,
    "sessions": 8234,
    "pageViews": 45892,
    "bounceRate": 0.42,
    "avgSessionDuration": 125.5
  }
}
```

---

## 🔧 Étape 8 : Ajouter le champ dans l'Admin V2

Ajouter un champ dans **Paramètres > Site** pour configurer le GA4 Property ID.

---

## 🐛 Troubleshooting

### Erreur : "Permission denied"

**Cause** : Le service account n'a pas accès à la propriété GA4

**Solution** :
1. Vérifier que l'email du service account est bien ajouté dans GA4
2. Vérifier le rôle (minimum Viewer)
3. Attendre 5-10 minutes pour la propagation

### Erreur : "API not enabled"

**Cause** : Google Analytics Data API n'est pas activée

**Solution** :
1. Aller dans Google Cloud Console
2. APIs & Services > Library
3. Chercher "Google Analytics Data API"
4. Cliquer sur Enable

### Erreur : "Property not found"

**Cause** : Le Property ID est incorrect

**Solution** :
1. Vérifier le format : `properties/123456789`
2. Vérifier que le Property ID existe dans GA4
3. Vérifier dans MongoDB que le champ est bien renseigné

### Pas de données

**Cause** : Le site n'a pas encore de tracking GA4

**Solution** :
1. Vérifier que le tag GA4 est installé sur le site
2. Vérifier dans GA4 Realtime qu'il y a du trafic
3. Attendre 24-48h pour avoir des données historiques

---

## 📚 Documentation

- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [GA4 Property ID](https://support.google.com/analytics/answer/9539598)

---

## 🎯 Résumé

1. ✅ Créer Service Account dans Google Cloud
2. ✅ Télécharger le fichier JSON
3. ✅ Activer Google Analytics Data API
4. ✅ Donner accès Viewer au Service Account dans GA4
5. ✅ Récupérer le Property ID
6. ✅ Configurer GOOGLE_APPLICATION_CREDENTIALS
7. ✅ Ajouter ga4PropertyId dans MongoDB
8. ✅ Redémarrer le backend
9. ✅ Tester avec curl

**Temps estimé** : 15-20 minutes
