export default function RenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal wrapper — no navbar, footer, or app chrome.
  // Force dark mode for consistent rendering.
  return <div data-theme="dark">{children}</div>;
}
