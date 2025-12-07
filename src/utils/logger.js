/**
 * Logger utilitaire pour remplacer console.log
 * En production, les logs de debug sont désactivés
 */

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info: (...args) => {
    console.log('ℹ️ ', ...args);
  },
  
  success: (...args) => {
    console.log('✅', ...args);
  },
  
  error: (...args) => {
    console.error('❌', ...args);
  },
  
  warn: (...args) => {
    console.warn('⚠️ ', ...args);
  },
  
  debug: (...args) => {
    if (isDev) {
      console.log('🔍', ...args);
    }
  },
};

export default logger;
