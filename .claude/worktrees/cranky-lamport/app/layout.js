import { Analytics } from '@vercel/analytics/next';
import NavBar from '../src/NavBar';
import './globals.css';

export const metadata = {
  title: 'Resume Customizer',
  description: 'Tailor your resume to job descriptions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
