export type RouteAccessPolicy = 'public' | 'authenticated' | 'admin';

export type InterfaceSurface =
  | 'public'
  | 'app'
  | 'admin'
  | 'dev'
  | 'api'
  | 'test';

export interface AppRoute {
  path: string;
  label: string;
  description: string;
  access: RouteAccessPolicy;
  isActive: boolean;
  surface: InterfaceSurface;
}

export const routes: AppRoute[] = [
  { path: '/', label: 'Landing / Login', description: 'Public entry point', access: 'public', isActive: true, surface: 'public' },
  { path: '/app', label: 'Home / Dashboard', description: 'Main authenticated baseline', access: 'authenticated', isActive: true, surface: 'app' },
  { path: '/forbidden', label: 'Forbidden Page', description: 'Unauthorized access gate', access: 'public', isActive: true, surface: 'public' },
  { path: '/settings', label: 'User Settings', description: 'Profile and app preferences', access: 'authenticated', isActive: true, surface: 'app' },
  
  // Admin only
  { path: '/admin', label: 'Admin Panel', description: 'System metrics and diagnostics', access: 'admin', isActive: true, surface: 'admin' },
  { path: '/admin/sitemap', label: 'Sitemap / Routes', description: 'Internal route map (Admin Only)', access: 'admin', isActive: true, surface: 'admin' },
  
  // Dev
  { path: '/dev', label: 'Developer Docs', description: 'System documentation (Admin Only)', access: 'admin', isActive: true, surface: 'dev' },
  { path: '/dev/routing', label: 'Developer Docs - Routing', description: 'Routing architecture and rules (Admin Only)', access: 'admin', isActive: true, surface: 'dev' },
  { path: '/dev/data-model', label: 'Developer Docs - Data Model', description: 'EFP schema and database specs (Admin Only)', access: 'admin', isActive: true, surface: 'dev' },
  { path: '/dev/security', label: 'Developer Docs - Security', description: 'Access control and auth policy (Admin Only)', access: 'admin', isActive: true, surface: 'dev' },
  { path: '/dev/demo', label: 'Hardware API Demos', description: 'Experimental capabilities', access: 'admin', isActive: true, surface: 'dev' },
  { path: '/dev/library-demo', label: 'Library & AI Demos', description: 'AI & TensorFlow sandbox', access: 'admin', isActive: true, surface: 'dev' },

  { path: '/test', label: 'Experimental Sandbox', description: 'UI/UX layout playground', access: 'admin', isActive: true, surface: 'test' },

  // Rebuilt / Pending EFP routes
  { path: '/object/new', label: 'New Object', description: 'Create EFP-native Object record', access: 'authenticated', isActive: true, surface: 'app' },
  { path: '/object/:id', label: 'Object Detail', description: 'View EFP-native Object record', access: 'authenticated', isActive: true, surface: 'app' },
  { path: '/item/:id', label: 'Item Legacy Redirect', description: 'Legacy redirect to object', access: 'authenticated', isActive: false, surface: 'app' },
  
  // Contained legacy pages
  { path: '/search', label: 'Search (Legacy)', description: 'Search inventory (Contained)', access: 'authenticated', isActive: false, surface: 'app' },
  { path: '/overview', label: 'Stats (Legacy)', description: 'Inventory statistics (Contained)', access: 'authenticated', isActive: false, surface: 'app' },
  { path: '/unassigned', label: 'Unassigned (Legacy)', description: 'Manage unassigned tags (Contained)', access: 'authenticated', isActive: false, surface: 'app' }
];
