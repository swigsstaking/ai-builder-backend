import TelegramBot from 'node-telegram-bot-api';
import logger from '../utils/logger.js';

// Token du bot @selfnodeBot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7678038783:AAGK-xnh7hTPo7VWMUzs9GbjE8DobqPFZWY';

let bot = null;

/**
 * Initialise le bot Telegram en mode Polling
 */
export const initTelegramBot = () => {
    if (bot) return bot; // Déjà initialisé

    try {
        // Création du bot
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

        // Gestion des erreurs de polling (évite le crash de l'app)
        bot.on('polling_error', (error) => {
            // On log juste en debug pour ne pas spammer si réseau instable
            if (error.code !== 'EFATAL') {
                logger.warn(`[Telegram] Polling Warning: ${error.code}`);
            } else {
                logger.error(`[Telegram] Polling Error: ${error.message}`);
            }
        });

        // Commande /start
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const username = msg.from.first_name || 'User';
            
            const welcomeMessage = `
👋 *Welcome ${username} to SelfNodes Alert Bot!*

Your unique Chat ID is: \`${chatId}\`

📋 *Instructions:*
1. Copy this ID: \`${chatId}\`
2. Go to your SelfNodes Dashboard
3. Open Settings > Telegram Alerts
4. Paste the ID and click Connect.

✅ You will then receive monitoring alerts right here.
            `;

            bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
            logger.info(`[Telegram] New /start from ${username} (${chatId})`);
        });

        logger.success('🤖 Telegram Bot Service Started (Polling Mode)');
        
        return bot;
    } catch (error) {
        logger.error('❌ Failed to init Telegram Bot:', error);
        return null;
    }
};

/**
 * Envoie une alerte à un utilisateur spécifique
 * @param {string} chatId - L'ID Telegram de l'utilisateur
 * @param {string} message - Le message à envoyer
 * @param {boolean} useMarkdown - Utiliser le formatage Markdown (défaut: true)
 */
export const sendTelegramAlert = async (chatId, message, useMarkdown = true) => {
    if (!bot) {
        // Tentative de ré-init si perdu
        initTelegramBot();
    }

    if (!bot) {
        logger.error('[Telegram] Cannot send alert: Bot not initialized');
        return false;
    }

    try {
        const options = useMarkdown ? { parse_mode: 'Markdown' } : {};
        await bot.sendMessage(chatId, message, options);
        return true;
    } catch (error) {
        logger.error(`[Telegram] Failed to send message to ${chatId}:`, error.message);
        return false;
    }
};

// Pour compatibilité avec le code existant qui attendrait 'sendAlertToAdmin'
// (Même si ici on vise les utilisateurs finaux)
export const sendAlertToAdmin = async (message) => {
    const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || '1195449614';
    return sendTelegramAlert(ADMIN_ID, `🚨 *Admin Alert*\n\n${message}`);
};
