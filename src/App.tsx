import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Calendar, PenTool, Wrench, ShoppingCart, ArrowRight } from "lucide-react";
import Planificacion from "./pages/Planificacion";

const brand = "#086c7c";

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const onHome = loc.pathname === "/";
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="mx-auto max-w-[1400px] px-4 py-6 flex items-center gap-4">
        <img src="/diagonal.png" alt="Diagonal" className="h-7 w-auto" />
        <h1 className="text-2xl font-semibold">Panel de coordinación</h1>
        {!onHome && (
          <Link
            to="/"
            className="ml-auto text-sm px-3 py-1 rounded-full border border-neutral-700 hover:bg-neutral-800"
          >
            ← Volver al inicio
          </Link>
        )}
      </header>
      {children}
    </div>
  );
}

function Card({
  to,
  title,
  icon,
  desc,
}: {
  to: string;
  title: string;
  icon: React.ReactNode;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition p-5 flex items-start gap-4"
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center border border-neutral-800"
        style={{ color: brand }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <ArrowRight className="opacity-0 group-hover:opacity-100 transition" size={18} />
        </div>
        <p className="text-sm text-neutral-400 mt-1">{desc}</p>
      </div>
    </Link>
  );
}

function Home() {
  return (
    <Shell>
      <main className="mx-auto max-w-[1400px] px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            to="/planificacion"
            title="Planificación de la producción"
            icon={<Calendar size={20} />}
            desc="Cronograma, entregables puntuales y recurrentes."
          />
          <Card
            to="/diseno"
            title="Diseño"
            icon={<PenTool size={20} />}
            desc="Briefs, aprobaciones y tiempos de diseño."
          />
          <Card
            to="/taller"
            title="Taller"
            icon={<Wrench size={20} />}
            desc="Capacidades, rutas y seguimiento de ejecución."
          />
          <Card
            to="/ventas"
            title="Ventas"
            icon={<ShoppingCart size={20} />}
            desc="Pedidos, confirmaciones y coordinación con producción."
          />
        </div>
      </main>
    </Shell>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <Shell>
      <main className="mx-auto max-w-[1400px] px-4 pb-20">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-neutral-300">En construcción. Vamos a crear esta sección a continuación.</p>
        </div>
      </main>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/planificacion"
        element={
          <div>
            <Planificacion />
          </div>
        }
      />
      <Route path="/diseno" element={<Placeholder title="Diseño" />} />
      <Route path="/taller" element={<Placeholder title="Taller" />} />
      <Route path="/ventas" element={<Placeholder title="Ventas" />} />
    </Routes>
  );
}
