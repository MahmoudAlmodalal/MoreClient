import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

// App shell: a flex row whose direction follows the document `dir`, so in RTL
// the sidebar lands on the right automatically. Each page renders its own
// <Header> (title varies per route).
export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
