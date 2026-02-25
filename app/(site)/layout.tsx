import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import MobileBlocker from "@/app/components/MobileBlocker";

import "../globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MobileBlocker />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}