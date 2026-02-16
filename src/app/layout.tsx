import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Fantasy Board",
  description: "Private fantasy cricket league board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-200">
        <nav className="sticky top-0 z-50 glass border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-white hover:opacity-90 transition-opacity">
                  <span className="text-2xl filter drop-shadow">🏏</span>
                  <span className="hidden sm:block">Fantasy<span className="text-indigo-400">Board</span></span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-hide">
                {[
                  { name: 'Leaderboard', href: '/' },
                  { name: 'Admin', href: '/admin' },
                  { name: 'Teams', href: '/admin/teams' },
                  { name: 'Sync', href: '/admin/sync' },
                ].map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
