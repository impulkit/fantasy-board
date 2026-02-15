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
      <body>
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <span className="logo-icon">🏏</span>
            Fantasy Board
          </Link>
          <div className="navbar-links">
            <Link href="/">Leaderboard</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/admin/teams">Teams</Link>
            <Link href="/admin/sync">Sync</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
