import Link from "next/link";
import { signOut } from "@/app/login/actions";

export function AppHeader() {
  return (
    <header className="topbar">
      <Link href="/" className="brand" translate="no">
        Chasely
      </Link>
      <nav className="topnav" aria-label="Main">
        <Link href="/" className="btn btn-quiet">
          Checklists
        </Link>
        <Link href="/settings" className="btn btn-quiet">
          Settings
        </Link>
        <form action={signOut}>
          <button type="submit" className="btn btn-quiet">
            Log out
          </button>
        </form>
      </nav>
    </header>
  );
}
