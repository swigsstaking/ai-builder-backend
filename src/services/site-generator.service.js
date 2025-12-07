/**
 * Site Generator Service
 * Genere des projets React deployables a partir des templates AI Builder
 */

import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

// Configuration des pages par type de site
export const SITE_TYPE_PAGES = {
  restaurant: ['home', 'menu', 'events', 'gallery', 'contact', 'about'],
  ecommerce: ['home', 'shop', 'product', 'contact', 'about'],
  'auto-ecole': ['home', 'courses', 'services', 'contact', 'about'],
  portfolio: ['home', 'gallery', 'services', 'about', 'contact'],
  services: ['home', 'services', 'about', 'contact'],
  startup: ['home', 'services', 'about', 'contact'],
  luxury: ['home', 'shop', 'product', 'gallery', 'about', 'contact'],
  custom: ['home', 'services', 'shop', 'product', 'about', 'contact'],
};

// Routes par page
export const PAGE_ROUTES = {
  home: { path: '/', component: 'Home', label: 'Accueil' },
  services: { path: '/services', component: 'Services', label: 'Services' },
  shop: { path: '/boutique', component: 'Shop', label: 'Boutique' },
  product: { path: '/produit/:slug', component: 'Product', label: 'Produit' },
  menu: { path: '/carte', component: 'Menu', label: 'Carte' },
  contact: { path: '/contact', component: 'Contact', label: 'Contact' },
  about: { path: '/a-propos', component: 'About', label: 'A propos' },
  gallery: { path: '/galerie', component: 'Gallery', label: 'Galerie' },
  events: { path: '/evenements', component: 'Events', label: 'Evenements' },
  courses: { path: '/cours', component: 'Courses', label: 'Cours' },
};

// Templates disponibles
export const AVAILABLE_TEMPLATES = ['modern', 'bold', 'elegant', 'minimal', 'artistic'];

// Couleurs par defaut selon le template
export const DEFAULT_COLORS = {
  modern: { primary: '#0ea5e9', secondary: '#1e293b', accent: '#f59e0b' },
  bold: { primary: '#ef4444', secondary: '#0f172a', accent: '#fbbf24' },
  elegant: { primary: '#b8860b', secondary: '#1a1a1a', accent: '#d4af37' },
  minimal: { primary: '#374151', secondary: '#111827', accent: '#6366f1' },
  artistic: { primary: '#ec4899', secondary: '#0f172a', accent: '#8b5cf6' },
};

/**
 * Genere la configuration complete du site
 */
export const generateSiteConfig = (options) => {
  const {
    siteName,
    siteSlug,
    siteDomain,
    siteDescription,
    siteType = 'custom',
    template = 'modern',
    colors = {},
    contact = {},
    social = {},
    pages = null,
    language = 'fr',
    generatedContent = null,
  } = options;

  const enabledPages = pages || SITE_TYPE_PAGES[siteType] || SITE_TYPE_PAGES.custom;
  const templateColors = DEFAULT_COLORS[template] || DEFAULT_COLORS.modern;

  return {
    siteName,
    siteSlug,
    siteDomain: siteDomain || `${siteSlug}.swigs.online`,
    siteDescription: siteDescription || '',
    siteType,
    template,
    language,
    colors: {
      primary: colors.primary || templateColors.primary,
      secondary: colors.secondary || templateColors.secondary,
      accent: colors.accent || templateColors.accent,
    },
    contact: {
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
    },
    social: {
      facebook: social.facebook || '',
      instagram: social.instagram || '',
      linkedin: social.linkedin || '',
    },
    pages: enabledPages,
    routes: enabledPages.map(page => ({
      ...PAGE_ROUTES[page],
      page,
    })),
    generatedContent,
  };
};

/**
 * Genere un slug a partir du nom
 */
export const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

/**
 * Valide la configuration du site
 */
export const validateSiteConfig = (config) => {
  const errors = [];

  if (!config.siteName || config.siteName.trim() === '') {
    errors.push('Le nom du site est requis');
  }

  if (!config.siteSlug || config.siteSlug.trim() === '') {
    errors.push('Le slug du site est requis');
  } else if (!/^[a-z0-9-]+$/.test(config.siteSlug)) {
    errors.push('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets');
  }

  if (!config.template || !AVAILABLE_TEMPLATES.includes(config.template)) {
    errors.push('Template invalide');
  }

  if (!config.pages || config.pages.length === 0) {
    errors.push('Au moins une page est requise');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Genere les fichiers du projet
 */
export const generateProjectFiles = (config) => {
  const files = {};

  // Package.json
  files['package.json'] = JSON.stringify({
    name: config.siteSlug,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@tanstack/react-query': '^5.17.0',
      'lucide-react': '^0.303.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.21.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.1',
      'autoprefixer': '^10.4.16',
      'postcss': '^8.4.32',
      'tailwindcss': '^3.4.0',
      'vite': '^5.0.8',
    },
  }, null, 2);

  // Vite config
  files['vite.config.js'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false }
})`;

  // Tailwind config
  files['tailwind.config.js'] = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '${config.colors.primary}' },
        secondary: { DEFAULT: '${config.colors.secondary}' },
        accent: { DEFAULT: '${config.colors.accent}' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`;

  // PostCSS config
  files['postcss.config.js'] = `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}`;

  // Index.html
  files['index.html'] = `<!DOCTYPE html>
<html lang="${config.language}">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.siteName}</title>
    <meta name="description" content="${config.siteDescription}" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  // .env.production
  files['.env.production'] = `VITE_API_URL=https://swigs.online/api
VITE_SITE_SLUG=${config.siteSlug}`;

  // .gitignore
  files['.gitignore'] = `node_modules
dist
.env
.env.local
.DS_Store`;

  // README
  files['README.md'] = `# ${config.siteName}

Site genere par AI Builder.

## Installation

\`\`\`bash
npm install
\`\`\`

## Developpement

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Configuration

- Modifier \`.env.production\` pour configurer l'API
- Le slug du site est : \`${config.siteSlug}\`
`;

  // main.jsx
  files['src/main.jsx'] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)`;

  // index.css
  files['src/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }`;

  // App.jsx
  const pageImports = config.routes.map(r => 
    `import ${r.component} from './pages/${r.component}'`
  ).join('\n');
  
  const routeElements = config.routes.map(r => 
    `        <Route path="${r.path}" element={<${r.component} />} />`
  ).join('\n');

  files['src/App.jsx'] = `import { Routes, Route } from 'react-router-dom'
import { useSiteInfo } from './hooks/useSiteInfo'

${pageImports}

function App() {
  const { siteInfo, isLoading } = useSiteInfo()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '${config.colors.primary}' }}></div>
      </div>
    )
  }

  return (
    <Routes>
${routeElements}
    </Routes>
  )
}

export default App`;

  // useSiteInfo hook
  files['src/hooks/useSiteInfo.js'] = `import { useQuery } from '@tanstack/react-query'
import seoConfig from '../data/seo.json'

const API_URL = import.meta.env.VITE_API_URL || 'https://swigs.online/api'
const SITE_SLUG = import.meta.env.VITE_SITE_SLUG || seoConfig.slug

export const useSiteInfo = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['siteInfo', SITE_SLUG],
    queryFn: async () => {
      try {
        const response = await fetch(\`\${API_URL}/public/sites/\${SITE_SLUG}\`)
        if (!response.ok) throw new Error('Site not found')
        return response.json()
      } catch (err) {
        console.warn('Using fallback site info')
        return null
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const siteInfo = {
    name: data?.data?.name || seoConfig.site?.name,
    slug: SITE_SLUG,
    description: data?.data?.description || seoConfig.site?.description,
    theme: data?.data?.theme || {
      primaryColor: '${config.colors.primary}',
      secondaryColor: '${config.colors.secondary}',
      accentColor: '${config.colors.accent}',
    },
    contact: data?.data?.contact || seoConfig.global?.contact || {},
  }

  return { siteInfo, isLoading, error }
}

export default useSiteInfo`;

  // SEO config
  files['src/data/seo.json'] = JSON.stringify({
    slug: config.siteSlug,
    site: {
      name: config.siteName,
      domain: config.siteDomain,
      description: config.siteDescription,
    },
    global: {
      siteName: config.siteName,
      siteUrl: `https://${config.siteDomain}`,
      language: config.language,
      contact: config.contact,
      social: config.social,
    },
    pages: Object.fromEntries(
      config.routes.map(r => [r.page, {
        title: r.page === 'home' ? config.siteName : `${r.label} - ${config.siteName}`,
        description: config.siteDescription,
      }])
    ),
  }, null, 2);

  // Pages - placeholder (les vrais templates seront copies depuis ai-builder)
  config.routes.forEach(route => {
    files[`src/pages/${route.component}.jsx`] = generatePageComponent(route, config);
  });

  return files;
};

/**
 * Genere un composant de page
 */
const generatePageComponent = (route, config) => {
  return `import { useSiteInfo } from '../hooks/useSiteInfo'

/**
 * Page ${route.label}
 * Template: ${config.template}
 */
const ${route.component} = () => {
  const { siteInfo } = useSiteInfo()

  // TODO: Remplacer par le vrai composant du template ${config.template}
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-4">${route.label}</h1>
        <p className="text-gray-600">Page generee par AI Builder</p>
        <p className="text-sm text-gray-400 mt-4">Template: ${config.template}</p>
      </div>
    </div>
  )
}

export default ${route.component}`;
};

export default {
  generateSiteConfig,
  generateProjectFiles,
  validateSiteConfig,
  generateSlug,
  SITE_TYPE_PAGES,
  PAGE_ROUTES,
  AVAILABLE_TEMPLATES,
  DEFAULT_COLORS,
};
