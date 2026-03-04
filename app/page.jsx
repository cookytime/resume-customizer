import ResumeCustomizer from '../src/App';
import { auth0 } from '../lib/auth0';

export default async function Page() {
  const session = await auth0.getSession();

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          {session ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-gray-700">
                Signed in as <span className="font-medium">{session.user.email || session.user.name}</span>
              </p>
              <a className="text-blue-700 hover:underline" href="/auth/logout">
                Logout
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-gray-700">You are not signed in.</p>
              <div className="flex gap-4">
                <a className="text-blue-700 hover:underline" href="/auth/login?screen_hint=signup">
                  Signup
                </a>
                <a className="text-blue-700 hover:underline" href="/auth/login">
                  Login
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      <ResumeCustomizer />
    </>
  );
}
