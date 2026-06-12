export interface RouteInfo {
  path: string;
  component: string;
  access: string;
  navigation: string;
  purpose: string;
  notes?: string;
}

export interface RouteGroup {
  groupName: string;
  routes: RouteInfo[];
}

export const routeGroups: RouteGroup[] = [
  {
    groupName: 'Main App',
    routes: [
      {
        path: '/',
        component: 'LandingPage',
        access: 'public',
        navigation: 'none',
        purpose: 'public landing/login and explicit app-entry route',
        notes: 'Authenticated users remain on the landing page and use the explicit Open App action to enter /app.'
      },
      {
        path: '/status',
        component: 'LandingPage',
        access: 'public',
        navigation: 'landing page',
        purpose: 'public app status modal overlay',
        notes: 'Renders the LandingPage with the AppStatusDialog open.'
      },
      {
        path: '/app',
        component: 'Dashboard',
        access: 'signed-in user',
        navigation: 'bottom Home',
        purpose: 'authenticated app home'
      },
      {
        path: '/search',
        component: 'SearchScreen',
        access: 'signed-in user',
        navigation: 'bottom Search',
        purpose: 'text/photo object search'
      },
      {
        path: '/object/new',
        component: 'CaptureForm',
        access: 'signed-in user',
        navigation: 'bottom New',
        purpose: 'create object'
      },
      {
        path: '/object/:id',
        component: 'CaptureForm',
        access: 'signed-in user',
        navigation: 'dashboard/search/scanner/direct URL',
        purpose: 'view/edit object by ID',
        notes: 'ID normalization rules apply'
      },
      {
        path: '/item/:id',
        component: 'Navigate',
        access: 'signed-in user',
        navigation: 'legacy URL',
        purpose: 'Redirect to /object/:id',
        notes: 'Legacy redirect to /object/:id for old QR codes; implemented under the authenticated app shell.'
      },
      {
        path: '/unassigned',
        component: 'UnassignedIdentifierScreen',
        access: 'signed-in user',
        navigation: 'scanner',
        purpose: 'handle scanned tags that are not yet bound to an object'
      },
      {
        path: '/scanner',
        component: 'Scanner',
        access: 'signed-in user',
        navigation: 'bottom Scan',
        purpose: 'QR/NFC scan'
      },
      {
        path: '/overview',
        component: 'Overview',
        access: 'signed-in user',
        navigation: 'bottom Stats',
        purpose: 'statistics overview'
      }
    ]
  },
  {
    groupName: 'Admin & Settings',
    routes: [
      {
        path: '/admin',
        component: 'AdminPanel',
        access: 'admin only',
        navigation: 'profile menu',
        purpose: 'admin metrics/control panel'
      },
      {
        path: '/admin/migration',
        component: 'Migration Tool Retired',
        access: 'admin only',
        navigation: 'none',
        purpose: 'Retired legacy items-to-objects migration tool',
        notes: 'Now displays a deprecation warning indicating the tool has been retired.'
      },
      {
        path: '/admin/sitemap',
        component: 'SitemapPage',
        access: 'admin only',
        navigation: 'profile menu',
        purpose: 'human-readable route map'
      },
      {
        path: '/settings',
        component: 'UserSettingsPanel',
        access: 'signed-in user',
        navigation: 'profile menu',
        purpose: 'preferences'
      }
    ]
  },
  {
    groupName: 'Sandbox & Demos',
    routes: [
      {
        path: '/test',
        component: 'TestScreen',
        access: 'signed-in user',
        navigation: 'profile menu',
        purpose: 'experimental/beta tests'
      },
      {
        path: '/demo',
        component: 'DemoScreen',
        access: 'signed-in user',
        navigation: 'profile menu',
        purpose: 'browser/device API demos'
      },
      {
        path: '/library-demo',
        component: 'LibraryDemoScreen',
        access: 'signed-in user',
        navigation: 'profile menu',
        purpose: 'library and AI demos'
      }
    ]
  },
  {
    groupName: 'Documentation',
    routes: [
      {
        path: '/about',
        component: 'AppAboutPage',
        access: 'public',
        navigation: 'profile menu',
        purpose: 'public app information page',
      },
      {
        path: '/database-structure',
        component: 'DatabaseStructurePage',
        access: 'signed-in user',
        navigation: 'about page / direct URL',
        purpose: 'Pointer to canonical docs, not a live database browser.',
        notes: 'Static documentation view only. Does not connect to live database.'
      },
      {
        path: '/developer',
        component: 'DeveloperDocsPage',
        access: 'public',
        navigation: 'landing page',
        purpose: 'public developer docs overview'
      },
      {
        path: '/developer/routes',
        component: 'DeveloperRoutesDoc',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public developer route documentation'
      },
      {
        path: '/developer/pwa',
        component: 'DeveloperPWADoc',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public PWA architecture documentation'
      },
      {
        path: '/developer/data-model',
        component: 'DeveloperDataModelDoc',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public data model overview hub'
      },
      {
        path: '/developer/data-model/abstract',
        component: 'DeveloperAbstractModelDoc',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public abstract data model documentation'
      },
      {
        path: '/developer/data-model/firestore',
        component: 'DeveloperFirestoreModelDoc',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public Firestore implementation documentation'
      },
      {
        path: '/developer/data-model-graph',
        component: 'DeveloperDataModelGraph',
        access: 'public',
        navigation: 'developer docs nav',
        purpose: 'public sigma.js data model visualization'
      }
    ]
  },
  {
    groupName: 'System',
    routes: [
      {
        path: '*',
        component: 'AuthenticatedAppLayout',
        access: 'signed-in user',
        navigation: 'none',
        purpose: 'protected fallback that renders the authenticated app shell before delegating app routes to nested Routes',
        notes: 'Top-level fallback is wrapped by RequireAuth before rendering AuthenticatedAppLayout; its nested fallback renders MainLayout.'
      }
    ]
  }
];
