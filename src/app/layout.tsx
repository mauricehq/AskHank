import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./providers";

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
      backgroundColor: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      border: "1px solid #D9D3CC",
    },
    headerTitle: {
      color: "#1F1F1F",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "#7A7A7A",
    },
    formButtonPrimary: {
      backgroundColor: "#C65A2E",
      "&:hover": {
        backgroundColor: "#B04E26",
      },
    },
    formFieldInput: {
      borderColor: "#D9D3CC",
      backgroundColor: "#FFFFFF",
      "&:focus": {
        borderColor: "#C65A2E",
      },
    },
    dividerLine: {
      backgroundColor: "#D9D3CC",
    },
    dividerText: {
      color: "#7A7A7A",
    },
    footerActionLink: {
      color: "#C65A2E",
      "&:hover": {
        color: "#B04E26",
      },
    },
  },
};

export const metadata: Metadata = {
  title: "Ask Hank",
  description: "Tell him what you want to buy. He says no.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
