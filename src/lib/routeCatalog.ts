export type RouteAccessPolicy = 'public' | 'authenticated' | 'admin';

export interface AppRoute {
  path: string;
  label: string;
  description: string;
  access: RouteAccessPolicy;
  isActive: boolean;
}

export const routes: AppRoute[] = [
  { path: '/', label: 'Landing / Login', description: 'Public entry point', access: 'public', isActive: true },
  { path: '/app', label: 'Home / Dashboard', description: 'Main authenticated baseline', access: 'authenticated', isActive: true },
  { path: '/forbidden', label: 'Forbidden Page', description: 'Unauthorized access gate', access: 'public', isActive: true },
  { path: '/settings', label: 'User Settings', description: 'Profile and app preferences', access: 'authenticated', isActive: true },
  
  // Admin only
  { path: '/admin', label: 'Admin Panel', description: 'System metrics and diagnostics', access: 'admin', isActive: true },
  { path: '/admin/sitemap', label: 'Sitemap / Routes', description: 'Internal route map (Admin Only)', access: 'admin', isActive: true },
  { path: '/developer', label: 'Developer Docs', description: 'System documentation (Admin Only)', access: 'admin', isActive: true },
  { path: '/demo', label: 'Hardware API Demos', description: 'Experimental capabilities', access: 'admin', isActive: true },
  { path: '/library-demo', label: 'Library & AI Demos', description: 'AI & TensorFlow sandbox', access: 'admin', isActive: true },
  { path: '/test', label: 'Experimental Sandbox', description: 'UI/UX layout playground', access: 'admin', isActive: true },

  // Rebuilt / Pending EFP routes
  { path: '/object/new', label: 'New Object', description: 'Create EFP-native Object record', access: 'authenticated', isActive: true },
  { path: '/object/:id', label: 'Object Detail', description: 'View EFP-native Object record', access: 'authenticated', isActive: true },
  { path: '/item/:id', label: 'Item Legacy Redirect', description: 'Legacy redirect to object', access: 'authenticated', isActive: false },
  
  // Contained legacy pages
  { path: '/search', label: 'Search (Legacy)', description: 'Search inventory (Contained)', access: 'authenticated', isActive: false },
  { path: '/overview', label: 'Stats (Legacy)', description: 'Inventory statistics (Contained)', access: 'authenticated', isActive: false },
  { path: '/unassigned', label: 'Unassigned (Legacy)', description: 'Manage unassigned tags (Contained)', access: 'authenticated', isActive: false }
];
