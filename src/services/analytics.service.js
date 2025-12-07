import { BetaAnalyticsDataClient } from '@google-analytics/data';

/**
 * Service Google Analytics 4
 * 
 * Configuration requise :
 * 1. Créer un Service Account dans Google Cloud Console
 * 2. Activer Google Analytics Data API
 * 3. Télécharger le fichier JSON des credentials
 * 4. Ajouter GOOGLE_APPLICATION_CREDENTIALS dans .env
 * 5. Donner accès au Service Account dans GA4 (Viewer role)
 */

class AnalyticsService {
  constructor() {
    // Le client se configure automatiquement avec GOOGLE_APPLICATION_CREDENTIALS
    this.analyticsDataClient = new BetaAnalyticsDataClient();
  }

  /**
   * Récupérer les métriques générales pour un site
   * @param {string} propertyId - ID de la propriété GA4 (format: properties/123456789)
   * @param {number} days - Nombre de jours d'historique (défaut: 30)
   */
  async getOverview(propertyId, days = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        dimensions: [],
        metrics: [
          { name: 'activeUsers' },           // Visiteurs actifs
          { name: 'newUsers' },              // Nouveaux visiteurs
          { name: 'sessions' },              // Sessions
          { name: 'screenPageViews' },       // Pages vues
          { name: 'bounceRate' },            // Taux de rebond
          { name: 'averageSessionDuration' }, // Durée moyenne session
        ],
      });

      const row = response.rows?.[0];
      if (!row) {
        return {
          users: 0,
          newUsers: 0,
          sessions: 0,
          screenPageViews: 0,
          bounceRate: 0,
          avgSessionDuration: 0,
        };
      }

      return {
        users: parseInt(row.metricValues[0].value) || 0,
        newUsers: parseInt(row.metricValues[1].value) || 0,
        sessions: parseInt(row.metricValues[2].value) || 0,
        screenPageViews: parseInt(row.metricValues[3].value) || 0,
        bounceRate: parseFloat(row.metricValues[4].value) || 0,
        avgSessionDuration: parseFloat(row.metricValues[5].value) || 0,
      };
    } catch (error) {
      console.error('❌ Erreur Analytics getOverview:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer l'évolution du trafic (graphique)
   * @param {string} propertyId - ID de la propriété GA4
   * @param {number} days - Nombre de jours d'historique
   */
  async getTrafficHistory(propertyId, days = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      return response.rows?.map(row => ({
        date: this.formatDate(row.dimensionValues[0].value),
        visitors: parseInt(row.metricValues[0].value) || 0,
        sessions: parseInt(row.metricValues[1].value) || 0,
        pageViews: parseInt(row.metricValues[2].value) || 0,
      })) || [];
    } catch (error) {
      console.error('❌ Erreur Analytics getTrafficHistory:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les sources de trafic
   * @param {string} propertyId - ID de la propriété GA4
   * @param {number} days - Nombre de jours d'historique
   */
  async getTrafficSources(propertyId, days = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      });

      return response.rows?.map(row => ({
        source: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0,
      })) || [];
    } catch (error) {
      console.error('❌ Erreur Analytics getTrafficSources:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les pages les plus vues
   * @param {string} propertyId - ID de la propriété GA4
   * @param {number} days - Nombre de jours d'historique
   * @param {number} limit - Nombre de résultats
   */
  async getTopPages(propertyId, days = 30, limit = 10) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit,
      });

      return response.rows?.map(row => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value,
        views: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0,
      })) || [];
    } catch (error) {
      console.error('❌ Erreur Analytics getTopPages:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les appareils utilisés
   * @param {string} propertyId - ID de la propriété GA4
   * @param {number} days - Nombre de jours d'historique
   */
  async getDevices(propertyId, days = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
          },
        ],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      });

      return response.rows?.map(row => ({
        device: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value) || 0,
        sessions: parseInt(row.metricValues[1].value) || 0,
      })) || [];
    } catch (error) {
      console.error('❌ Erreur Analytics getDevices:', error.message);
      throw error;
    }
  }

  /**
   * Comparer avec la période précédente
   * @param {string} propertyId - ID de la propriété GA4
   * @param {number} days - Nombre de jours
   */
  async getComparison(propertyId, days = 30) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: propertyId,
        dateRanges: [
          {
            startDate: `${days}daysAgo`,
            endDate: 'today',
            name: 'current',
          },
          {
            startDate: `${days * 2}daysAgo`,
            endDate: `${days + 1}daysAgo`,
            name: 'previous',
          },
        ],
        dimensions: [],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
      });

      const current = response.rows?.[0];
      const previous = response.rows?.[1];

      if (!current || !previous) {
        return {
          visitors: { current: 0, previous: 0, change: 0 },
          sessions: { current: 0, previous: 0, change: 0 },
          pageViews: { current: 0, previous: 0, change: 0 },
        };
      }

      const calculateChange = (curr, prev) => {
        if (prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
      };

      const visitorsCurrent = parseInt(current.metricValues[0].value) || 0;
      const visitorsPrevious = parseInt(previous.metricValues[0].value) || 0;
      const sessionsCurrent = parseInt(current.metricValues[1].value) || 0;
      const sessionsPrevious = parseInt(previous.metricValues[1].value) || 0;
      const pageViewsCurrent = parseInt(current.metricValues[2].value) || 0;
      const pageViewsPrevious = parseInt(previous.metricValues[2].value) || 0;

      return {
        visitors: {
          current: visitorsCurrent,
          previous: visitorsPrevious,
          change: calculateChange(visitorsCurrent, visitorsPrevious),
        },
        sessions: {
          current: sessionsCurrent,
          previous: sessionsPrevious,
          change: calculateChange(sessionsCurrent, sessionsPrevious),
        },
        pageViews: {
          current: pageViewsCurrent,
          previous: pageViewsPrevious,
          change: calculateChange(pageViewsCurrent, pageViewsPrevious),
        },
      };
    } catch (error) {
      console.error('❌ Erreur Analytics getComparison:', error.message);
      throw error;
    }
  }

  /**
   * Formater une date GA4 (YYYYMMDD) en format lisible
   * @param {string} gaDate - Date au format YYYYMMDD
   * @returns {string} Date au format DD/MM
   */
  formatDate(gaDate) {
    const year = gaDate.substring(0, 4);
    const month = gaDate.substring(4, 6);
    const day = gaDate.substring(6, 8);
    return `${day}/${month}`;
  }
}

export default new AnalyticsService();
