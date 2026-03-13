import ResumeCustomizer from '../src/App';
import { auth0 } from '../lib/auth0';

export default async function Page() {
  const session = await auth0.getSession();
  if (!session) {
    // Redirect to login page if not authenticated
    // next/navigation is only available in server components
    const { redirect } = await import('next/navigation');
    redirect('/login');
    return null;
  }
  return (
    <>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-700">
              Signed in as <span className="font-medium">{session.user.email || session.user.name}</span>
            </p>
            <a className="text-blue-700 hover:underline" href="/auth/logout">
              Logout
            </a>
          </div>
        </div>
      </div>
      <ResumeCustomizer />
    </>
  );
}
