import { NavLink, Route, Routes } from "react-router-dom";
import { FeedPage } from "./pages/FeedPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { SourcesPage } from "./pages/SourcesPage";

const links = [
  { to: "/", label: "Feed", end: true },
  { to: "/companies", label: "Companies", end: false },
  { to: "/sources", label: "Sources", end: false },
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <strong>Pellet Demand Radar</strong>
            <span>Live tenders · purchase signals · India</span>
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/sources" element={<SourcesPage />} />
      </Routes>
    </div>
  );
}
