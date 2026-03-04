import { redirect } from 'next/navigation';
import { auth0 } from '../../lib/auth0';

export default async function LoginPage() {
  const session = await auth0.getSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Customizer</h1>
        <p className="text-gray-500 mb-8">
          Tailor your resume to any job description with the help of AI.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/auth/login"
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Log In
          </a>
          <a
            href="/auth/login?screen_hint=signup"
            className="block w-full rounded-lg border border-blue-600 px-4 py-3 text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
