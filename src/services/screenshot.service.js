import puppeteer from 'puppeteer';

/**
 * Auto-scroll page to trigger lazy loading
 */
const autoScroll = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const maxScrolls = 20; // Limit to prevent infinite scroll
      let scrollCount = 0;
      
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0); // Return to top
          resolve();
        }
      }, 150);
    });
  });
};

/**
 * Hide cookie banners and popups
 */
const hideCookieBanners = async (page) => {
  await page.evaluate(() => {
    // Common cookie banner selectors
    const selectors = [
      '[class*="cookie"]', '[id*="cookie"]',
      '[class*="consent"]', '[id*="consent"]',
      '[class*="gdpr"]', '[id*="gdpr"]',
      '[class*="privacy"]', '[id*="privacy-banner"]',
      '[class*="popup"]', '[class*="modal"]',
      '.cc-banner', '#onetrust-banner-sdk',
      '.cookie-notice', '.cookie-bar',
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
    });
    
    // Also try to click accept buttons
    const acceptButtons = document.querySelectorAll(
      '[class*="accept"], [id*="accept"], button[class*="cookie"], .cc-accept'
    );
    acceptButtons.forEach(btn => {
      try { btn.click(); } catch (e) {}
    });
  });
};

/**
 * Capture screenshots of a website's pages
 * @param {string} url - Base URL of the website
 * @param {Object} options - Screenshot options
 * @returns {Promise<Array<{page: string, screenshot: Buffer}>>}
 */
export const captureWebsiteScreenshots = async (url, options = {}) => {
  const {
    pages = ['/', '/about', '/contact', '/services'],
    viewport = { width: 1280, height: 900 },
    fullPage = false, // Changed: capture viewport only for better OCR
    timeout = 30000,
    maxPages = 5,
  } = options;

  // Ensure URL has protocol
  const baseUrl = url.startsWith('http') ? url : `https://${url}`;
  
  console.log(`📸 Starting screenshot capture for: ${baseUrl}`);
  
  let browser;
  const screenshots = [];

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block videos and large media to speed up
      if (['media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Capture homepage first
    try {
      console.log(`📸 Capturing: ${baseUrl}`);
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout 
      });
      
      // Hide cookie banners
      await hideCookieBanners(page);
      
      // Scroll to trigger lazy loading
      await autoScroll(page);
      
      // Wait for images to load
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
      
      const screenshot = await page.screenshot({ 
        fullPage,
        type: 'jpeg',
        quality: 85,
      });
      
      screenshots.push({
        page: '/',
        url: baseUrl,
        screenshot,
        size: screenshot.length,
      });
      
      console.log(`✅ Captured homepage (${(screenshot.length / 1024).toFixed(1)}KB)`);
    } catch (err) {
      console.error(`❌ Failed to capture homepage:`, err.message);
    }

    // Try to find and capture other pages from navigation
    try {
      const navLinks = await page.evaluate(() => {
        const links = [];
        const anchors = document.querySelectorAll('nav a, header a, .nav a, .menu a');
        anchors.forEach(a => {
          const href = a.getAttribute('href');
          const text = a.textContent.trim();
          if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            links.push({ href, text });
          }
        });
        return links;
      });

      // Capture up to 2 additional pages (for speed)
      const pagesToCapture = navLinks.slice(0, 2);
      
      for (const link of pagesToCapture) {
        try {
          const pageUrl = link.href.startsWith('http') 
            ? link.href 
            : new URL(link.href, baseUrl).href;
          
          // Skip external links
          if (!pageUrl.includes(new URL(baseUrl).hostname)) continue;
          
          console.log(`📸 Capturing: ${pageUrl} (${link.text})`);
          
          await page.goto(pageUrl, { 
            waitUntil: 'networkidle2',
            timeout 
          });
          
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 800)));
          
          const screenshot = await page.screenshot({ 
            fullPage,
            type: 'jpeg',
            quality: 80,
          });
          
          screenshots.push({
            page: link.href,
            pageName: link.text,
            url: pageUrl,
            screenshot,
            size: screenshot.length,
          });
          
          console.log(`✅ Captured ${link.text} (${(screenshot.length / 1024).toFixed(1)}KB)`);
        } catch (err) {
          console.error(`❌ Failed to capture ${link.text}:`, err.message);
        }
      }
    } catch (err) {
      console.error('❌ Error finding navigation links:', err.message);
    }

  } catch (error) {
    console.error('❌ Screenshot service error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log(`📸 Captured ${screenshots.length} screenshots total`);
  return screenshots;
};

/**
 * Capture a single page screenshot
 */
export const capturePageScreenshot = async (url, options = {}) => {
  const {
    viewport = { width: 1920, height: 1080 },
    fullPage = true,
  } = options;

  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    
    const screenshot = await page.screenshot({ 
      fullPage,
      type: 'jpeg',
      quality: 80,
    });
    
    return screenshot;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export default {
  captureWebsiteScreenshots,
  capturePageScreenshot,
};
