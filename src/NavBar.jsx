'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Customizer', icon: FileText },
    { href: '/dashboard', label: 'Job Pipeline', icon: LayoutDashboard },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <span className="font-bold text-gray-900 text-sm tracking-tight">Resume Customizer</span>
        <div className="flex items-center gap-1 ml-4">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
