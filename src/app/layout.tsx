import type { Metadata, Viewport } from "next";
import "./globals.css";

// Times New Roman is a system font on every platform this app targets, so
// no next/font/Google Fonts loading is needed for body text — only the
// Material Symbols icon font below still comes from Google Fonts.

export const metadata: Metadata = {
  title: "First Class Washing Bay — Management System",
  description: "Record washes, split revenue transparently, and pay your washing boys.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "First Class",
  },
};

export const viewport: Viewport = {
  themeColor: "#493ee5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Material Symbols is an icon font, not a text typeface, so it's
            loaded directly rather than through next/font. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-md text-body-md min-h-screen">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
