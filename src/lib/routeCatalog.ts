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
        component: 'Dashboard',
        access: 'signed-in user',
        navigation: 'bottom Home',
        purpose: 'object dashboard'
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
        access: 'all',
        navigation: 'legacy URL',
        purpose: 'Redirect to /object/:id',
        notes: 'Legacy support for old QR codes'
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
        path: '/admin/sitemap',
        component: 'SitemapPage',
        access: 'admin only',
        navigation: 'profile menu',
        purpose: 'human-readable route map'
      },
      {
        path: '/admin/migration',
        component: 'MigrationScreen',
        access: 'admin only',
        navigation: 'profile menu',
        purpose: 'admin database migration tool'
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
    groupName: 'System',
    routes: [
      {
        path: '*',
        component: 'MainLayout',
        access: 'all',
        navigation: 'none',
        purpose: 'delegates main app routes to nested Routes',
        notes: 'Top-level fallback. Delegates main app routes to nested Routes.'
      }
    ]
  }
];
