import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main id="main" className="login">
      <h1>Not found</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        This page doesn&rsquo;t exist, or it isn&rsquo;t yours to see.
      </p>
      <Link href="/" className="btn">
        Back to checklists
      </Link>
    </main>
  );
}
