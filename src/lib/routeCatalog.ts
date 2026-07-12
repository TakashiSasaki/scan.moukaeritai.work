export interface AppRoute {
  path: string;
  label: string;
  description: string;
  isAdminOnly: boolean;
  isActive: boolean;
}

export const routes: AppRoute[] = [
  { path: '/', label: 'Landing / Login', description: 'Public entry point', isAdminOnly: false, isActive: true },
  { path: '/app', label: 'Home / Dashboard', description: 'Main authenticated baseline', isAdminOnly: false, isActive: true },
  { path: '/forbidden', label: 'Forbidden Page', description: 'Unauthorized access gate', isAdminOnly: false, isActive: true },
  { path: '/settings', label: 'User Settings', description: 'Profile and app preferences', isAdminOnly: false, isActive: true },
  { path: '/admin', label: 'Admin Panel', description: 'System metrics and diagnostics', isAdminOnly: true, isActive: true },
  { path: '/admin/sitemap', label: 'Sitemap / Routes', description: 'Internal route map (Admin Only)', isAdminOnly: true, isActive: true },
  { path: '/developer', label: 'Developer Docs', description: 'System documentation (Admin Only)', isAdminOnly: true, isActive: true },
  
  // Rebuilt / Pending EFP routes
  { path: '/object/new', label: 'New Object', description: 'EFP pending placeholder', isAdminOnly: false, isActive: false },
  { path: '/object/:id', label: 'Edit Object', description: 'EFP pending placeholder', isAdminOnly: false, isActive: false },
  { path: '/item/:id', label: 'Item Legacy Redirect', description: 'Legacy redirect to object', isAdminOnly: false, isActive: false },
  
  // Contained legacy pages
  { path: '/search', label: 'Search (Legacy)', description: 'Search inventory (Contained)', isAdminOnly: false, isActive: false },
  { path: '/overview', label: 'Stats (Legacy)', description: 'Inventory statistics (Contained)', isAdminOnly: false, isActive: false },
  { path: '/unassigned', label: 'Unassigned (Legacy)', description: 'Manage unassigned tags (Contained)', isAdminOnly: false, isActive: false },
  
  // Demos and beta tools
  { path: '/demo', label: 'Hardware API Demos', description: 'Experimental capabilities', isAdminOnly: true, isActive: true },
  { path: '/library-demo', label: 'Library & AI Demos', description: 'AI & TensorFlow sandbox', isAdminOnly: true, isActive: true },
  { path: '/test', label: 'Experimental Sandbox', description: 'UI/UX layout playground', isAdminOnly: true, isActive: true },
];
