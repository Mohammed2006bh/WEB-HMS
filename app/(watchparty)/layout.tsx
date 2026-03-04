import "@/app/globals.css";

export const metadata = {
  title: "Watch Party",
};

export default function WatchPartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
