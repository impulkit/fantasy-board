export const metadata = {
  title: "Fantasy Board",
  description: "Private fantasy league board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
