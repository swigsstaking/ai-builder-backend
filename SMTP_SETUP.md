# Configuration SMTP pour l'envoi d'emails

## Problème actuel
❌ Les identifiants Gmail configurés ne fonctionnent pas
❌ Gmail bloque l'authentification avec mot de passe simple

## Solutions

### Option 1: Mot de passe d'application Gmail (Recommandé si vous utilisez Gmail)

1. **Activer la validation en 2 étapes** sur le compte Gmail
   - Aller sur https://myaccount.google.com/security
   - Activer "Validation en 2 étapes"

2. **Créer un mot de passe d'application**
   - Aller sur https://myaccount.google.com/apppasswords
   - Sélectionner "Autre (nom personnalisé)"
   - Entrer "Speed-L CMS"
   - Copier le mot de passe généré (16 caractères)

3. **Mettre à jour le .env**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # Le mot de passe d'application
   SMTP_FROM="Speed-L" <noreply@speed-l.ch>
   ```

### Option 2: Utiliser Infomaniak (Recommandé pour domaine speed-l.ch)

Si vous avez un compte email chez Infomaniak (hébergeur suisse):

```bash
SMTP_HOST=mail.infomaniak.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@speed-l.ch  # ou info@speed-l.ch
SMTP_PASS=votre_mot_de_passe
SMTP_FROM="Speed-L" <noreply@speed-l.ch>
```

### Option 3: Utiliser un service SMTP dédié

**Brevo (ex-Sendinblue)** - Gratuit jusqu'à 300 emails/jour:
```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@speed-l.ch
SMTP_PASS=votre_clé_api_brevo
SMTP_FROM="Speed-L" <noreply@speed-l.ch>
```

**SendGrid** - Gratuit jusqu'à 100 emails/jour:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=votre_clé_api_sendgrid
SMTP_FROM="Speed-L" <noreply@speed-l.ch>
```

## Étapes de configuration

1. **Choisir une option** ci-dessus

2. **Modifier le .env sur le serveur**:
   ```bash
   ssh swigs@192.168.110.73
   cd ~/swigs-apps/swigs-cms-backend
   nano .env
   # Modifier les variables SMTP_*
   ```

3. **Redémarrer le backend**:
   ```bash
   pm2 restart swigs-cms-backend
   ```

4. **Tester l'envoi**:
   ```bash
   node scripts/test-email.js
   ```

5. **Vérifier la réception** dans info@speed-l.ch

## Recommandation

Pour Speed-L, je recommande **Option 2 (Infomaniak)** si vous avez déjà un compte email chez eux, sinon **Option 3 (Brevo)** qui est gratuit, fiable et facile à configurer.
