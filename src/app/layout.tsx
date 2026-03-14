import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import { ThemeProvider } from "@/components/ThemeProvider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const clerkAppearance = {
  variables: {
    colorPrimary: "#C65A2E",
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: "10px",
  },
  elements: {
    card: {
      backgroundColor: "var(--bg-card)",
      boxShadow: "var(--shadow-lg)",
      border: "1px solid var(--border)",
    },
    headerTitle: {
      color: "var(--text)",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "var(--text-secondary)",
    },
    formButtonPrimary: {
      backgroundColor: "#C65A2E",
      "&:hover": {
        backgroundColor: "#B04E26",
      },
    },
    formFieldInput: {
      borderColor: "var(--border)",
      backgroundColor: "var(--input-bg)",
      color: "var(--text)",
      "&:focus": {
        borderColor: "#C65A2E",
      },
    },
    formFieldLabel: {
      color: "var(--text)",
    },
    dividerLine: {
      backgroundColor: "var(--border)",
    },
    dividerText: {
      color: "var(--text-secondary)",
    },
    footerActionLink: {
      color: "#C65A2E",
      "&:hover": {
        color: "#B04E26",
      },
    },
    socialButtonsBlockButton: {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border)",
      color: "var(--text)",
      "&:hover": {
        backgroundColor: "var(--bg)",
      },
    },
    userButtonPopoverCard: {
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border)",
    },
    userButtonPopoverActionButton: {
      color: "var(--text)",
      "&:hover": {
        backgroundColor: "var(--bg-surface)",
      },
    },
    userButtonPopoverActionButtonText: {
      color: "var(--text)",
    },
    userButtonPopoverFooter: {
      borderColor: "var(--border)",
    },
  },
};

export const metadata: Metadata = {
  title: "Ask Hank",
  description: "Tell him what you want to buy. He says no.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ClerkProvider appearance={clerkAppearance}>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
