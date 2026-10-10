import AuthWatcher from '@/components/auth/auth-watcher';

/**
 * Wraps every /dashboard route so a tab left open here notices when the
 * session ends somewhere else. Kept off the root layout deliberately: the
 * landing page would otherwise have to ship the Supabase client for nothing.
 */
export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <>
      <AuthWatcher />
      {children}
    </>
  );
}
