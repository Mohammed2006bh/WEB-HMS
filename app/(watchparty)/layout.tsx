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
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://static.doubleclick.net" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <script src="https://www.youtube.com/iframe_api" async />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
