# SWIGS CMS Backend API

Backend API pour le système de gestion de contenu multi-sites SWIGS.

## 🚀 Installation

### Prérequis

- Node.js 18+
- MongoDB 6+

### Configuration

1. Installer les dépendances :
```bash
cd backend
npm install
```

2. Créer le fichier `.env` :
```bash
cp .env.example .env
```

3. Modifier les variables d'environnement dans `.env` :
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/swigs-cms
JWT_SECRET=votre-secret-jwt-unique
ADMIN_EMAIL=admin@swigs.online
ADMIN_PASSWORD=VotreMotDePasse123!
```

4. Créer le dossier uploads :
```bash
mkdir uploads
```

5. Initialiser la base de données :
```bash
npm run seed
```

## 🏃 Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

L'API sera accessible sur :
- **Développement** : `http://localhost:3000/api`
- **Production** : `https://swigs.online/api`

## 📚 Documentation API

### Authentification

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@swigs.online",
  "password": "Admin123!"
}
```

Réponse :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@swigs.online",
    "name": "Admin SWIGS",
    "role": "admin"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Sites

#### Get All Sites
```http
GET /api/sites
Authorization: Bearer {token}
```

#### Get Single Site
```http
GET /api/sites/:id
Authorization: Bearer {token}
```

#### Create Site (Admin only)
```http
POST /api/sites
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Mon Site",
  "slug": "mon-site",
  "domain": "monsite.ch",
  "contact": {
    "phone": "079 123 45 67",
    "email": "contact@monsite.ch"
  }
}
```

### Cours

#### Get All Courses
```http
GET /api/courses?siteId={siteId}&status=active
Authorization: Bearer {token}
```

#### Create Course
```http
POST /api/courses
Authorization: Bearer {token}
Content-Type: application/json

{
  "site": "site_id",
  "title": "Cours de sensibilisation",
  "number": "N°609",
  "description": "Description du cours",
  "category": "sensibilisation",
  "price": {
    "amount": 280,
    "currency": "CHF",
    "display": "CHF 280.-"
  },
  "duration": "2 soirées",
  "dates": [
    {
      "day": "Mercredi",
      "date": "2025-10-22",
      "time": "18h25"
    }
  ],
  "status": "active"
}
```

#### Update Course
```http
PUT /api/courses/:id
Authorization: Bearer {token}
Content-Type: application/json
```

#### Delete Course
```http
DELETE /api/courses/:id
Authorization: Bearer {token}
```

### SEO

#### Get SEO
```http
GET /api/seo?siteId={siteId}&page=home
Authorization: Bearer {token}
```

#### Create/Update SEO
```http
POST /api/seo
Authorization: Bearer {token}
Content-Type: application/json

{
  "site": "site_id",
  "page": "home",
  "title": "Titre SEO (max 60 caractères)",
  "description": "Description SEO (max 160 caractères)",
  "keywords": ["mot-clé1", "mot-clé2"],
  "robots": "index,follow"
}
```

### Media

#### Upload File
```http
POST /api/media/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [fichier image]
siteId: {siteId}
```

Réponse :
```json
{
  "success": true,
  "data": {
    "url": "https://swigs.online/uploads/buffet/1761412734615-500127393.webp",
    "filename": "1761412734615-500127393.webp",
    "originalName": "image.webp",
    "mimetype": "image/webp",
    "size": 245678
  }
}
```

#### Get All Files
```http
GET /api/media
Authorization: Bearer {token}
```

#### Delete File
```http
DELETE /api/media/:id
Authorization: Bearer {token}
```

### Routes Publiques (sans authentification)

Ces routes sont accessibles sans token JWT pour les sites frontend.

#### Get Site Info
```http
GET /api/public/sites/:slug
```

Exemple : `GET /api/public/sites/buffet`

Réponse :
```json
{
  "success": true,
  "data": {
    "_id": "68fa38c3483f6dc7aa5e8c35",
    "name": "Buffet de la Gare chez Claude TEST",
    "slug": "buffet",
    "domain": "buffet-de-la-gare.swigs.online",
    "contact": { ... },
    "theme": { ... }
  }
}
```

#### Get Menu Content
```http
GET /api/public/content?siteId={siteId}&type=menu
```

#### Get Events Content
```http
GET /api/public/content?siteId={siteId}&section=events
```

## 🔐 Sécurité

- Authentification JWT
- Hachage des mots de passe avec bcrypt
- Rate limiting (100 requêtes / 15 minutes)
- Helmet.js pour les headers de sécurité
- Validation des données avec express-validator
- CORS configuré

## 📁 Structure du projet

```
backend/
├── src/
│   ├── controllers/     # Logique métier
│   ├── models/          # Modèles MongoDB
│   ├── routes/          # Routes API
│   ├── middleware/      # Middlewares
│   └── scripts/         # Scripts utilitaires
├── uploads/             # Fichiers uploadés
├── .env                 # Variables d'environnement
├── server.js            # Point d'entrée
└── package.json
```

## 🛠️ Scripts disponibles

- `npm run dev` : Démarrer en mode développement (avec nodemon)
- `npm start` : Démarrer en mode production
- `npm run seed` : Initialiser la base de données

## 📝 Notes

- Le token JWT expire après 7 jours
- Les fichiers uploadés sont limités à 5MB
- Seules les images sont acceptées (jpeg, jpg, png, gif, webp, svg)
- Les mots de passe doivent contenir au moins 6 caractères
- **Domaine uploads** : `https://swigs.online/uploads/`
- **Routes publiques** : `/api/public/*` (sans authentification)
- **Routes protégées** : `/api/*` (authentification JWT requise)

## 🌐 Domaines et URLs

- **API Backend** : `https://swigs.online/api`
- **Admin** : `https://admin.swigs.online`
- **Uploads** : `https://swigs.online/uploads/{site-slug}/{filename}`
- **Site Buffet** : `https://buffet-de-la-gare.swigs.online`
- **Site Speed-L** : `https://speedl.swigs.online`

## 🚀 Déploiement sur Ubuntu

Voir le guide principal pour le déploiement complet avec PM2 et Nginx.
