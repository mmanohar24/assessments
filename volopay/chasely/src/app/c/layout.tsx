import type { Metadata } from "next";

// Client links are private. Keep them out of search engines, including the
// "not found" and "closed" pages. next.config.ts also sends X-Robots-Tag.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return children;
}
