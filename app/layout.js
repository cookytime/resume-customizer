import './globals.css';

export const metadata = {
  title: 'Resume Customizer',
  description: 'Tailor your resume to job descriptions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
