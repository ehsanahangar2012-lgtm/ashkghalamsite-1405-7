import { AppView } from '../types';

export const VIEW_PATH_MAP: Record<AppView, string> = {
  [AppView.HOME]: '/',
  [AppView.CATALOG]: '/catalog',
  [AppView.PORTFOLIO]: '/portfolio',
  [AppView.BLOG]: '/blog',
  [AppView.ABOUT]: '/about',
  [AppView.INQUIRY]: '/inquiry',
  [AppView.LIBRARY]: '/library',
  [AppView.SERVICES]: '/services',
  [AppView.PRODUCTS]: '/products',
  [AppView.DIELINE_GENERATOR]: '/tools/dieline',
  [AppView.DESIGN_STUDIO]: '/tools/design-studio',
  [AppView.AUTOCAD_STUDIO]: '/tools/autocad',
  [AppView.SOFTWARE_STORE]: '/software',
  [AppView.DASHBOARD]: '/dashboard',
  [AppView.ADMIN_PANEL]: '/admin',
  [AppView.ENTERPRISE_CMS]: '/admin',
  [AppView.SEO_ENGINE]: '/admin',
  [AppView.AI_CONTENT_FACTORY]: '/admin',
  [AppView.PROGRAMMATIC_SEO]: '/admin',
  [AppView.ENTERPRISE_DAM]: '/admin',
  [AppView.ENTERPRISE_DXP]: '/admin',
  [AppView.SUPPORT]: '/about',
  [AppView.ENGINEERING_CAD]: '/tools/dieline',
  [AppView.B2B_SUITE]: '/about',
  [AppView.NOT_FOUND]: '/404'
};

export const getPathForView = (view: AppView): string => {
  return VIEW_PATH_MAP[view] || '/';
};

export const getViewForPath = (pathname: string): AppView => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';

  if (normalized === '/') return AppView.HOME;
  if (normalized === '/catalog') return AppView.CATALOG;
  if (normalized === '/portfolio' || normalized.startsWith('/portfolio/')) return AppView.PORTFOLIO;
  if (normalized === '/blog' || normalized.startsWith('/blog/')) return AppView.BLOG;
  if (normalized === '/about') return AppView.ABOUT;
  if (normalized === '/inquiry') return AppView.INQUIRY;
  if (normalized === '/library') return AppView.LIBRARY;
  if (normalized === '/services' || normalized.startsWith('/services/')) return AppView.SERVICES;
  if (normalized === '/products' || normalized.startsWith('/products/')) return AppView.PRODUCTS;
  if (normalized === '/tools/dieline' || normalized === '/dieline') return AppView.DIELINE_GENERATOR;
  if (normalized === '/tools/design-studio' || normalized === '/design-studio') return AppView.DESIGN_STUDIO;
  if (normalized === '/tools/autocad' || normalized === '/autocad') return AppView.AUTOCAD_STUDIO;
  if (normalized === '/software') return AppView.SOFTWARE_STORE;
  if (normalized === '/dashboard') return AppView.DASHBOARD;
  if (normalized === '/admin' || normalized === '/admin-panel') return AppView.ADMIN_PANEL;

  return AppView.NOT_FOUND;
};
