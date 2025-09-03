import React from "react";
import { Upload, Download, Paperclip, ChevronDown } from "lucide-react";
import { supabase } from "./lib/supabase";

/* ===== Config ===== */
const brand = "#086c7c";
const PROJECT_START = new Date("2025-09-08T00:00:00"); // Lun 8/9/2025
const WEEKS = 12;

/* ===== Utilidades ===== */
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDM = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
const fmtDMY = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(
    d.getFullYear()
  ).slice(-2)}`;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
const weekIndex = (d: Date) =>
  Math.max(0, Math.min(11, Math.floor((d.getTime() - PROJECT_START.getTime()) / (7 * 86400000))));
const nextWeekday = (from: Date, weekday: number) => {
  const x = new Date(from);
  const add = (weekday - x.getDay() + 7) % 7;
  x.setDate(x.getDate() + add);
  x.setHours(9, 0, 0, 0);
  return x;
};

type PDFRef = { name: string; dataUrl: string };

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("No pude leer el archivo"));
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(f);
  });

const dataUrlToObjectUrl = (du: string) => {
  const bstr = atob(du.split(",")[1] || "");
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return URL.createObjectURL(new Blob([u8], { type: "application/pdf" }));
};

// Si es data:URL -> Blob URL; si es URL pública (Supabase), se usa tal cual.
const toPdfHref = (s: string) => (s?.startsWith("data:") ? dataUrlToObjectUrl(s) : s);

// --- Helpers para subir PDF a Supabase (reemplaza al viejo uploadPdfToStorage) ---
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD")                 // separa letras y acentos
    .replace(/[\u0300-\u036f]/g, "")  // quita acentos
    .replace(/[^a-zA-Z0-9._-]+/g, "-")// deja letras/números, punto, guion y guion bajo
    .replace(/-+/g, "-")              // colapsa múltiples guiones
    .replace(/(^-|-$)/g, "");

async function uploadPdfToStorage(file: File, keyPrefix: string) {
  // keyPrefix: 'ones/<codigo>' o 'recs/<codigo>'
  const key = `${keyPrefix}/${Date.now()}_${slug(file.name)}`;

  const { error } = await supabase
    .storage
    .from("entregables")
    .upload(key, file, {
      upsert: true,
      contentType: "application/pdf",
      cacheControl: "3600",
    });

  if (error) throw error;

  const { data } = supabase.storage.from("entregables").getPublicUrl(key);
  return { publicUrl: data.publicUrl, path: key };
}

/* ===== Tipos ===== */
type OneShot = {
  code: string;
  name: string;
  resp: string;
  dep?: string;
  start: string;
  end: string;
  details: string[];
  driveLink?: string;
  pdf?: PDFRef;
  uploadedAt?: string;
  draftDrive?: string;
  draftPdf?: PDFRef | null;
  _draftPdfFile?: File | null; // <-- agregado (una sola vez)
};

type RecurItem = {
  code:
    | "otd"
    | "lead"
    | "changelog"
    | "third30"
    | "min_daily"
    | "min_mma_mon"
    | "min_mma_thu"
    | "min_prod";
  name: string;
  freqDays: number;
  nextAt: string;
  draftDrive?: string;
  draftPdf?: PDFRef | null;
  _draftPdfFile?: File | null; // <-- agregado
  history: { promisedAt: string; uploadedAt: string; driveLink: string; pdf: PDFRef }[];
  details?: string[];
};

/* ===== Datos base ===== */
const oneBase: Omit<
  OneShot,
  "draftDrive" | "draftPdf" | "pdf" | "driveLink" | "uploadedAt" | "_draftPdfFile"
>[] = [
  {
    code: "prod10",
    name: "Elegir 10 productos (coord. Comercial)",
    resp: "Planificación + Comercial",
    start: addDays(PROJECT_START, 0).toISOString(),
    end: addDays(PROJECT_START, 6).toISOString(),
    details: [
      "Coordinar con Comercial (5 existen, sumar 5).",
      "Entregable: Listado de 10 productos priorizados.",
    ],
  },
  {
    code: "variantes",
    name: "Establecer variantes / características",
    resp: "Planificación",
    dep: "Dep.: Elegir 10 productos",
    start: addDays(PROJECT_START, 7).toISOString(),
    end: addDays(PROJECT_START, 20).toISOString(),
    details: ["Documento de variantes (similar clientes chicos)."],
  },
  {
    code: "tiempos",
    name: "Definir tiempos de entrega (estándar & express)",
    resp: "Producción + Planificación + Comercial",
    dep: "Dep.: Variantes/Características",
    start: addDays(PROJECT_START, 21).toISOString(),
    end: addDays(PROJECT_START, 34).toISOString(),
    details: ["Excel para prometer fechas (estándar/express)."],
  },
  {
    code: "rutas",
    name: "Rutas productivas + planes B (10 prod x variantes)",
    resp: "Producción (Mandos Medios)",
    dep: "Dep.: Tiempos de entrega",
    start: addDays(PROJECT_START, 35).toISOString(),
    end: addDays(PROJECT_START, 56).toISOString(),
    details: ["Diagramas de flujo por producto + plan B."],
  },
  {
    code: "taller",
    name: "Actividades de taller y tiempos por máquina",
    resp: "Producción",
    dep: "Dep.: Rutas productivas",
    start: addDays(PROJECT_START, 57).toISOString(),
    end: addDays(PROJECT_START, 76).toISOString(),
    details: ["Excel con tiempos inicio / por cantidad / cierre (actualizable)."],
  },
  {
    code: "tercerizados_listado",
    name: "Listar actividades tercerizadas (con Pablo) + tiempos",
    resp: "Producción + Pablo",
    dep: "Corre en paralelo desde S2",
    start: addDays(PROJECT_START, 7).toISOString(),
    end: addDays(PROJECT_START, 13).toISOString(),
    details: ["Excel con proveedor, actividad, SLA/tiempo de entrega."],
  },
];

const recurBase: RecurItem[] = [
  {
    code: "otd",
    name: "Gráfica de cumplimiento de fecha de entrega (Semanal)",
    freqDays: 7,
    nextAt: addDays(PROJECT_START, 7).toISOString(),
    history: [],
    details: [
      "Gráfica con % de pedidos entregados en fecha esta semana (ej.: 45 en fecha de 55).",
      "Cada semana se agrega a la gráfica la semana siguiente.",
    ],
  },
  {
    code: "lead",
    name: "Tiempo promedio de pedidos en Planificación (Semanal)",
    freqDays: 7,
    nextAt: addDays(PROJECT_START, 7).toISOString(),
    history: [],
    details: [
      "Gráfica con el tiempo promedio que los pedidos estuvieron en el estado de planificar la producción, en ambos proyectos (diseñar y validar).",
    ],
  },
  {
    code: "changelog",
    name: "Cambios en tiempos de actividades del taller (Cada 15 días)",
    freqDays: 15,
    nextAt: addDays(PROJECT_START, 15).toISOString(),
    history: [],
    details: [
      "Se debe subir un documento con los cambios realizados al excel original de los tiempos de producción estimados.",
    ],
  },
  {
    code: "third30",
    name: "Chequeo de tercerizados (Cada 30 días)",
    freqDays: 30,
    nextAt: addDays(PROJECT_START, 30).toISOString(),
    history: [],
    details: [
      "Se debe subir un documento con los cambios realizados al excel original de los tiempos de tercerización.",
      "Dejar claro quiénes están cumpliendo y quiénes no.",
    ],
  },
  {
    code: "min_daily",
    name: "Minuta reunión diaria de coordinación (Diaria)",
    freqDays: 1,
    nextAt: PROJECT_START.toISOString(),
    history: [],
    details: [
      "Minuta de reunión con fecha, asistentes y temas hablados + agenda de próxima reunión.",
    ],
  },
  {
    code: "min_mma_mon",
    name: "Minuta MMA – Lunes (Semanal)",
    freqDays: 7,
    nextAt: nextWeekday(PROJECT_START, 1).toISOString(),
    history: [],
    details: [
      "Minuta de reunión con fecha, asistentes y temas hablados + agenda de próxima reunión.",
    ],
  },
  {
    code: "min_mma_thu",
    name: "Minuta MMA – Jueves (Semanal)",
    freqDays: 7,
    nextAt: nextWeekday(PROJECT_START, 4).toISOString(),
    history: [],
    details: [
      "Minuta de reunión con fecha, asistentes y temas hablados + agenda de próxima reunión.",
    ],
  },
  {
    code: "min_prod",
    name: "Minuta reunión de Producción (Semanal)",
    freqDays: 7,
    nextAt: addDays(PROJECT_START, 7).toISOString(),
    history: [],
    details: [
      "Minuta de reunión con fecha, asistentes y temas hablados + agenda de próxima reunión.",
    ],
  },
];

/* ===== Persistencia local (fallback UI) ===== */
const LS_KEY = "delegacion-ui-v6";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (s: any) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
};

/* ===== App ===== */
export default function App() {
  const weeks = React.useMemo(
    () => Array.from({ length: WEEKS }, (_, i) => addDays(PROJECT_START, i * 7)),
    []
  );
  const initial = React.useMemo(
    () =>
      loadState() ?? {
        ones: oneBase.map((t) => ({ ...t, draftDrive: "", draftPdf: null })),
        recs: recurBase.map((r) => ({ ...r, draftDrive: "", draftPdf: null })),
      },
    []
  );

  const [ones, setOnes] = React.useState<OneShot[]>(initial.ones);
  const [recs, setRecs] = React.useState<RecurItem[]>(initial.recs);
  const [open, setOpen] = React.useState<Record<string | number, boolean>>({});

  // Carga inicial desde Supabase (pisará el estado local si hay datos)
  React.useEffect(() => {
    (async () => {
      try {
        // --- ONES ---
        const { data: onesRows, error: onesErr } = await supabase.from("ones").select("*");
        if (onesErr) throw onesErr;

        if (onesRows?.length) {
          const merged = oneBase.map((base) => {
            const row = onesRows.find((r: any) => r.code === base.code);
            return {
              ...base,
              driveLink: row?.drive_link ?? undefined,
              pdf: row?.pdf_path
                ? { name: (row.pdf_path as string).split("/").pop() || "archivo.pdf", dataUrl: row.pdf_path }
                : undefined,
              uploadedAt: row?.uploaded_at ?? undefined,
              draftDrive: "",
              draftPdf: null,
            } as OneShot;
          });
          setOnes(merged);
        } else {
          // Seed inicial si está vacío
          await supabase.from("ones").upsert(
            oneBase.map((o) => ({
              code: o.code,
              name: o.name,
              resp: o.resp,
              dep: o.dep ?? null,
              start: o.start,
              end: o.end,
              details: o.details,
            }))
          );
        }

        // --- RECS + HISTORIAL ---
        const { data: recRows, error: recErr } = await supabase.from("recs").select("*");
        if (recErr) throw recErr;

        const { data: histRows, error: histErr } = await supabase
          .from("rec_history")
          .select("*")
          .order("uploaded_at", { ascending: false });
        if (histErr) throw histErr;

        if (recRows?.length) {
          const mergedRecs = recurBase.map((base) => {
            const row = recRows.find((r: any) => r.code === base.code);
            const hist = (histRows || []).filter((h: any) => h.rec_code === base.code);
            return {
              ...base,
              nextAt: row?.next_at ?? base.nextAt,
              draftDrive: "",
              draftPdf: null,
              history: hist.map((h: any) => ({
                promisedAt: h.promised_at,
                uploadedAt: h.uploaded_at,
                driveLink: h.drive_link,
                pdf: {
                  name: (h.pdf_path as string).split("/").pop() || "archivo.pdf",
                  dataUrl: h.pdf_path, // URL pública del bucket
                },
              })),
            } as RecurItem;
          });
          setRecs(mergedRecs);
        } else {
          await supabase.from("recs").upsert(
            recurBase.map((r) => ({
              code: r.code,
              name: r.name,
              freq_days: r.freqDays,
              next_at: r.nextAt,
            }))
          );
        }
      } catch (e) {
        console.error("Supabase load error:", e);
      }
    })();
  }, []);

  // Guardar snapshot en localStorage (fallback)
  React.useEffect(() => saveState({ ones, recs }), [ones, recs]);

// Helper local para nombre seguro en Storage
const safeName = (s: string) => s.replace(/[^\w.\-]+/g, "-");

/* -------- One-shot -------- */
const pickPdfOne = async (i: number, f: File | null) => {
  if (!f || f.type !== "application/pdf") return;
  if (f.size > 12 * 1024 * 1024) {
    alert("PDF muy grande (>12MB).");
    return;
  }
  const du = await fileToDataUrl(f);
  const copy = [...ones];
  copy[i].draftPdf = { name: f.name, dataUrl: du };
  copy[i]._draftPdfFile = f; // necesario para subir a Storage
  setOnes(copy);
};

const submitOne = async (i: number) => {
  const t = ones[i];
  if (!t._draftPdfFile || !t.draftDrive) return;

  try {
    // 1) Subir PDF a Storage (ruta completa dentro del bucket)
    const fileName = slugFileName(t._draftPdfFile.name);
    const key = `ones/${t.code}/${Date.now()}_${fileName}`;
    const up = await uploadPdfToStorage(t._draftPdfFile, key);
    const now = new Date().toISOString();

    // 2) Guardar/actualizar en tabla "ones"
    const { error } = await supabase.from("ones").upsert({
      code: t.code,
      drive_link: t.draftDrive,
      pdf_path: up.publicUrl, // guardamos la URL pública
      uploaded_at: now,
    });
    if (error) throw error;

    // 3) Reflejar en UI
    const copy = [...ones];
    copy[i] = {
      ...t,
      pdf: { name: t._draftPdfFile.name, dataUrl: up.publicUrl },
      driveLink: t.draftDrive,
      uploadedAt: now,
      draftPdf: null,
      draftDrive: "",
      _draftPdfFile: null,
    };
    setOnes(copy);
  } catch (err) {
    console.error(err);
    alert("No pude subir/guardar el PDF. Revisá la consola.");
  }
};

/* -------- Recurrentes -------- */
const pickPdfRecur = async (i: number, f: File | null) => {
  if (!f || f.type !== "application/pdf") return;
  if (f.size > 12 * 1024 * 1024) {
    alert("PDF muy grande (>12MB).");
    return;
  }
  const du = await fileToDataUrl(f);
  const copy = [...recs];
  copy[i].draftPdf = { name: f.name, dataUrl: du };
  copy[i]._draftPdfFile = f; // guardo el File real para subir
  setRecs(copy);
};

const submitRecur = async (i: number) => {
  const r = recs[i];
  if (!r._draftPdfFile || !r.draftDrive) return;

  try {
    // 1) Subir PDF a Storage
    const fileName = slugFileName(r._draftPdfFile.name);
    const key = `recs/${r.code}/${Date.now()}_${fileName}`;
    const up = await uploadPdfToStorage(r._draftPdfFile, key);
    const now = new Date().toISOString();

    // 2) Insertar historial
    const { error: histErr } = await supabase.from("rec_history").insert({
      rec_code: r.code,
      promised_at: r.nextAt,
      uploaded_at: now,
      drive_link: r.draftDrive,
      pdf_path: up.publicUrl, // URL pública del PDF
    });
    if (histErr) throw histErr;

    // 3) Avanzar próxima fecha en "recs"
    // 2) Avanzar próxima fecha (usar upsert incluyendo freq_days)
    const next = addDays(new Date(r.nextAt), r.freqDays).toISOString();

    const { error: recErr } = await supabase
      .from("recs")
      .upsert(
        {
          code: r.code,
          next_at: next,
          freq_days: r.freqDays,   // <— CLAVE: mandarlo para no violar NOT NULL
          name: r.name             // opcional, pero ayuda si la fila no existía
        },
        { onConflict: "code" }     // asegura que choque por PK y haga UPDATE
      );

    if (recErr) {
      alert("Error al actualizar próxima fecha");
      console.error(recErr);
      return;
    }


    // 4) Reflejar en UI
    const copy = [...recs];
    copy[i].history = [
      {
        promisedAt: r.nextAt,
        uploadedAt: now,
        driveLink: r.draftDrive,
        pdf: { name: r._draftPdfFile.name, dataUrl: up.publicUrl },
      },
      ...copy[i].history,
    ];
    copy[i].nextAt = next;
    copy[i].draftDrive = "";
    copy[i].draftPdf = null;
    copy[i]._draftPdfFile = null;
    setRecs(copy);
  } catch (err) {
    console.error(err);
    alert("No pude subir/guardar el PDF recurrente. Revisá la consola.");
  }
};

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header con logo exacto */}
      <header className="mx-auto max-w-[1400px] px-4 py-6 flex items-center gap-4">
        <img src="/diagonal.png" alt="Diagonal" className="h-7 w-auto" />
        <h1 className="text-2xl font-semibold">Delegación responsable de coordinación de Producción</h1>
      </header>

      {/* Objetivo + Funciones clave */}
      <section className="mx-auto max-w-[1400px] px-4 mb-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              Objetivo
            </h3>
            <p className="text-neutral-200 mt-1">
              Coordinar todo el flujo productivo, asegurando que los trabajos tengan asignados recursos (MP, humanos y
              máquinas), tiempos y prioridades antes de entrar en producción. Mejorar el flujo de comunicación entre
              comercial y producción, e interno de la producción. Velar por el cumplimiento de la planificación y
              establecer gatillos de emergencia cuando no se cumple.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              Funciones clave
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-neutral-200">
              <li>
                <b>Ingreso y orden de trabajo:</b> centralizar pedidos; asignar procesos/actividades (personas y
                máquinas con tiempos); asignar fecha de entrega solicitada; clasificar por prioridad.
              </li>
              <li>
                <b>Verificación de viabilidad:</b> confirmar disponibilidad de papel y MP; revisar capacidad de máquinas
                y personal.
              </li>
              <li>
                <b>Asignación de recursos:</b> definir máquinas y terminaciones más eficientes (incluye tercerización si
                aplica); agrupar trabajos similares.
              </li>
              <li>
                <b>Definición de tiempos de entrega:</b> estimar tiempos reales + margen; estándar y express.
              </li>
              <li>
                <b>Seguimiento y ajuste:</b> reunión diaria de coordinación; ajustar ante urgencias o bloqueos.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://docs.google.com/document/d/1YriXyG9mRkxBuSuMWO1uXPZiAC8V8lTOz0_L-5YOaKc/edit?usp=sharing"
              >
                Más detalles click acá
              </a>
            </h3>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-4 pb-20">
        {/* Semanas */}
        <section className="mb-4">
          <h3 className="text-xl font-semibold mb-3">Cronograma (Gantt)</h3>
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}>
            {weeks.map((d, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-800/70 flex flex-col items-center justify-center">
                <div>{fmtDM(d)}</div>
                <div className="opacity-75">{`S${i + 1}`}</div>
              </div>
            ))}
          </div>
        </section>

        {/* One-shot */}
        <section className="space-y-4">
          {ones.map((t, i) => {
            const locked = !!t.uploadedAt;
            const hasDrafts = !!t.draftPdf && !!t.draftDrive;
            const pdfUrl = t.pdf ? toPdfHref(t.pdf.dataUrl) : null;
            const sIdx = weekIndex(new Date(t.start));
            const eIdx = weekIndex(new Date(t.end));

            return (
              <div key={t.code} className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-neutral-700"
                    title="Ver detalles"
                  >
                    <ChevronDown size={18} className={`transition-transform ${open[i] ? "rotate-180" : ""}`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold">{t.name}</h4>
                    <div className="text-sm text-neutral-400">Resp.: {t.resp} {t.dep ? ` · ${t.dep}` : ""}</div>
                    <div className="mt-2 text-sm text-neutral-400">
                      Inicio: {fmtDMY(new Date(t.start))} · Fin: {fmtDMY(new Date(t.end))}
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-sm" style={{ color: brand, border: `1px solid ${brand}` }}>
                    Fecha objetivo: {fmtDMY(new Date(t.end))}
                  </span>
                </div>

                {/* Línea de carga */}
                <div className="mt-4 flex items-center gap-3 whitespace-nowrap overflow-x-auto flex-nowrap">
                  {locked ? (
                    <a
                      className="h-10 w-[220px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700"
                      href={pdfUrl!}
                      download={t.pdf?.name}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={18} />
                      <span className="truncate">{t.pdf?.name}</span>
                    </a>
                  ) : (
                    <label className="h-10 w-[150px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700 cursor-pointer">
                      <Paperclip size={18} />
                      <span className="truncate">{t.draftPdf?.name || "Adjuntar PDF"}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => pickPdfOne(i, e.target.files?.[0] || null)}
                      />
                    </label>
                  )}

                  {locked ? (
                    <a className="underline truncate w-[420px]" href={t.driveLink} target="_blank" rel="noreferrer">
                      {t.driveLink}
                    </a>
                  ) : (
                    <input
                      className="h-10 w-[1020px] px-3 rounded-xl border bg-neutral-950 border-neutral-700 text-neutral-100 outline-none"
                      placeholder="Link a Drive (cualquier link)"
                      value={t.draftDrive || ""}
                      onChange={(e) => {
                        const copy = [...ones];
                        copy[i].draftDrive = e.target.value;
                        setOnes(copy);
                      }}
                    />
                  )}

                  {!locked && (
                    <button
                      onClick={() => submitOne(i)}
                      disabled={!hasDrafts}
                      className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${
                        hasDrafts ? "text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                      }`}
                      style={{ background: hasDrafts ? brand : undefined }}
                      title={hasDrafts ? "Subir" : "Adjuntá PDF y Link"}
                    >
                      <Upload size={16} />
                    </button>
                  )}
                </div>

                {/* Mini-Gantt */}
                <div className="mt-3">
                  <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}>
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={idx} className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            background: idx >= sIdx && idx <= eIdx ? brand : "transparent",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {open[i] && (
                  <div className="mt-3 text-sm text-neutral-300">
                    <h5 className="font-semibold mb-1">Detalles</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {t.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Recurrentes */}
        <section className="mt-10">
          <h3 className="text-xl font-semibold mb-3">Entregables recurrentes</h3>

          <div className="rounded-2xl overflow-hidden border border-neutral-800">
            {recs.map((r, idx) => {
              const key = `rec_${idx}`;
              const opened = !!open[key];
              const canSubmit = !!r.draftDrive && !!r.draftPdf;
              const last = r.history[0];
              const lastPdfUrl = last ? toPdfHref(last.pdf.dataUrl) : null;

              return (
                <div key={r.code} className="border-t border-neutral-800 bg-neutral-900/40">
                  {/* Fila fija: [toggle | desc | próxima | pdf | link | subir] */}
                  <div
                    className="px-4 py-3 grid items-center gap-3"
                    style={{ gridTemplateColumns: "40px 510px 100px 150px 310px 40px" }}
                  >
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [key]: !s[key] }))}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-neutral-700"
                      title="Ver detalles / historial"
                    >
                      <ChevronDown size={16} className={`transition-transform ${opened ? "rotate-180" : ""}`} />
                    </button>

                    <div className="font-medium leading-tight">
                      <span className="line-clamp-2 break-words">{r.name}</span>
                    </div>

                    <div className="text-sm text-neutral-200 px-2 py-1 rounded-full border border-neutral-700 text-center">
                      {fmtDMY(new Date(r.nextAt))}
                    </div>

                    {last && !r.draftPdf ? (
                      <a
                        className="h-9 w-[150px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700"
                        href={lastPdfUrl!}
                        download={last.pdf.name}
                        target="_blank"
                        rel="noreferrer"
                        title="Descargar último PDF"
                      >
                        <Download size={16} />
                        <span className="truncate">{last.pdf.name}</span>
                      </a>
                    ) : (
                      <label className="h-9 w-[150px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700 cursor-pointer">
                        <Paperclip size={16} />
                        <span className="truncate">{r.draftPdf?.name || "Adjuntar PDF"}</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => pickPdfRecur(idx, e.target.files?.[0] || null)}
                        />
                      </label>
                    )}

                    {r.draftDrive ? (
                      <input
                        className="h-9 w-[310px] px-3 rounded-xl border bg-neutral-950 border-neutral-700 text-neutral-100 outline-none"
                        placeholder="https://drive.google.com/..."
                        value={r.draftDrive || ""}
                        onChange={(e) => {
                          const copy = [...recs];
                          copy[idx].draftDrive = e.target.value;
                          setRecs(copy);
                        }}
                      />
                    ) : last ? (
                      <a className="underline truncate w-[310px]" href={last.driveLink} target="_blank" rel="noreferrer">
                        {last.driveLink}
                      </a>
                    ) : (
                      <input
                        className="h-9 w-[310px] px-3 rounded-xl border bg-neutral-950 border-neutral-700 text-neutral-100 outline-none"
                        placeholder="https://drive.google.com/..."
                        value={r.draftDrive || ""}
                        onChange={(e) => {
                          const copy = [...recs];
                          copy[idx].draftDrive = e.target.value;
                          setRecs(copy);
                        }}
                      />
                    )}

                    <button
                      onClick={() => submitRecur(idx)}
                      disabled={!canSubmit}
                      className={`h-9 w-9 rounded-xl inline-flex items-center justify-center ${
                        canSubmit ? "text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                      }`}
                      style={{ background: canSubmit ? brand : undefined }}
                      title={canSubmit ? "Subir" : "Adjuntá PDF y Link"}
                    >
                      <Upload size={16} />
                    </button>
                  </div>

                  {opened && (
                    <div className="px-4 pb-4">
                      {r.details?.length ? (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 mb-3">
                          <div className="text-sm font-semibold mb-1" style={{ color: brand }}>
                            Detalles
                          </div>
                          <ul className="list-disc pl-5 text-sm space-y-1">
                            {r.details.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="rounded-xl border border-neutral-800 overflow-hidden">
                        <div className="grid grid-cols-[140px_160px_1fr_1fr] gap-2 bg-neutral-900/60 px-3 py-2 text-sm items-center">
                          <div className="text-center">Prometida</div>
                          <div className="text-center">Subida</div>
                          <div>PDF</div>
                          <div>Link</div>
                        </div>
                        {r.history.length ? (
                          r.history.map((h, j) => {
                            const href = toPdfHref(h.pdf.dataUrl);
                            return (
                              <div
                                key={j}
                                className="grid grid-cols-[140px_160px_1fr_1fr] gap-2 px-3 py-2 border-t border-neutral-800 items-center"
                              >
                                <div className="text-center">{fmtDMY(new Date(h.promisedAt))}</div>
                                <div className="text-center">{fmtDMY(new Date(h.uploadedAt))}</div>
                                <a className="underline truncate" href={href} download={h.pdf.name} target="_blank" rel="noreferrer">
                                  {h.pdf.name}
                                </a>
                                <a className="underline truncate" href={h.driveLink} target="_blank" rel="noreferrer">
                                  {h.driveLink}
                                </a>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-neutral-500">Sin registros</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
