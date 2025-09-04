import React from "react";
import { Upload, Download, Paperclip, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

const brand = "#086c7c";
const PROJECT_START = new Date("2025-09-08T00:00:00");
const WEEKS = 12;

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDM = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
const fmtDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
const weekIndex = (d: Date) => Math.max(0, Math.min(11, Math.floor((d.getTime() - PROJECT_START.getTime()) / (7 * 86400000))));

type PDFRef = { name: string; dataUrl: string };

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(new Error("No pude leer el archivo")); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(f); });
const dataUrlToObjectUrl = (du: string) => { const base = du.split(",")[1] || ""; try { const bstr = atob(base); const u8 = new Uint8Array(bstr.length); for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i); return URL.createObjectURL(new Blob([u8], { type: "application/pdf" })); } catch { return du; } };
const toPdfHref = (s: string) => s?.startsWith("data:") || s?.startsWith("http") ? s : dataUrlToObjectUrl(s);

const uploadPdfToStorage = async (file: File, key: string) => {
  const { error } = await supabase.storage.from("entregables").upload(key, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("entregables").getPublicUrl(key);
  return { publicUrl: data.publicUrl, path: key };
};

type OneShot = {
  code: string; name: string; resp: string; dep?: string;
  start: string; end: string; details: string[];
  driveLink?: string; pdf?: PDFRef; uploadedAt?: string;
  draftDrive?: string; draftPdf?: PDFRef | null; _draftPdfFile?: File | null;
};

type RecurItem = {
  code: string; name: string; freqDays: number; nextAt: string;
  draftDrive?: string; draftPdf?: PDFRef | null; _draftPdfFile?: File | null;
  history: { promisedAt: string; uploadedAt: string; driveLink: string; pdf: PDFRef }[];
  details?: string[];
};

const oneBase: Omit<OneShot,"draftDrive"|"draftPdf"|"pdf"|"driveLink"|"uploadedAt"|"_draftPdfFile">[] = [
  {"code":"taller_roles","name":"Escribir los roles de Ruben, Daniel y Fernando","resp":"Taller","start":addDays(PROJECT_START,0).toISOString(),"end":addDays(PROJECT_START,6).toISOString(),"details":["Entregable: Roles de cada uno escritos y acuerdo."]},
  {"code":"taller_errores","name":"Registro de errores","resp":"Taller","start":addDays(PROJECT_START,0).toISOString(),"end":addDays(PROJECT_START,6).toISOString(),"details":["Entregable: Planilla creada y validada con Ylan. Comunicado en reunión de equipo"]},
  {"code":"taller_tareas","name":"Generar un listado de tareas que se realizan en el taller","resp":"Taller","start":addDays(PROJECT_START,0).toISOString(),"end":addDays(PROJECT_START,6).toISOString(),"details":["Entregable: Excel con todas las tareas listadas. Estimación de tiempo de inicio, de trabajo según cantidad y de finalización. Cada tarea deberá tener un puntaje de dificultad"]},
  {"code":"taller_habilidades","name":"Generar un mapa de habilidades por persona","resp":"Taller","start":addDays(PROJECT_START,0).toISOString(),"end":addDays(PROJECT_START,6).toISOString(),"details":["Entregable: Excel con todas las tareas que pueden realizar los integrantes del taller"]},
  {"code":"taller_stock","name":"Control de stock","resp":"Taller","start":addDays(PROJECT_START,7).toISOString(),"end":addDays(PROJECT_START,13).toISOString(),"details":["Establecer según los lugares disponibles en la empresa y las necesidades de la misma, que stock maximo y minimo podemos tener de cada materia prima, estableciendo también el lugar donde debe estar. En caso de que separemos el stock a dos lugares (uno de facil acceso y otro con mas dificultad) tiene que estar claro el stock minimo y maximo de cada lugar. Una vez hecho el plan deberá ser aprobado, luego de eso establecer. 1. Encargado de hacer las compras cuando el stock llega al minimo 2. Encargado de mover la mercadería de un deposito al otro, cuando en el chico llega al minimo. 3. Poner carteleria clara de que materia prima va donde y su stock minimo y maximo. 4. En los lugares establecidos de atención al cliente, no puede haber mercadería en stock, puede estar en transito por maximo 24hs 5. Debe estar marcado en el piso, los lugares de tránsito (de personas o de mercadería) y los lugares donde puede apoyarse 6. Debe estar marcado y claro los lugares donde se recepciona mercadería y donde se despacha. Entregable: Excel con el listado de materias primas, su stock máximo y mínimo en cada depósito, estableciendo claramente donde se guarda. En ese mismo excel se deberá establecer responsable de compras, responsable de movimientos, fotos documentando la cartelería pegada en su lugar, fotos documentando los pisos marcados como corresponde, fotos documentando los lugares de despacho y recepción de mercadería."]},
  {"code":"taller_transito","name":"Plan de pedidos en transito.","resp":"Taller","start":addDays(PROJECT_START,14).toISOString(),"end":addDays(PROJECT_START,20).toISOString(),"details":["Cada estación de trabajo debe tener su lugar para los pedidos que entran y salen. Debe estar indicado claramente cual es el lugar de entrada y salida a cada maquina, así como perfectamente identificada cada maquina. No podrá haber pedidos en transito fuera de esas áreas a menos que se este transportando en ese momento. Las áreas marcadas de tránsito deberán permanecer vacias en todo momento. salvo durante un transito. Las mesas de trabajo son de trabajo, no de apoyo, por lo cual en caso de requerir una zona para entrada o salida, deberá tener otra mesa o establecer de manera clara cual es zona de entrada, cual es zona de trabajo y cual es zona de salida. Todos los trabajos que esten en una zona de salida o de entrada, deben estar perfectamente identificados, que trabajo es, que cliente es, que cantidad hay. Las mesas de trabajo deberán permanecer vacias de cualquier pedido con el que no se este trabajadno en ese momento. Por lo cual al cortar un pedido se deberá de mover el mismo a la zona de entrada. Entregable: Fotos documentales de cada máquina con su cartelería (nombre de máquina, zona de entrada y zona de salida), fotos documentales con las zonas de tránsito marcadas."]},
  {"code":"taller_deposito","name":"Plan de deposito","resp":"Taller","start":addDays(PROJECT_START,21).toISOString(),"end":addDays(PROJECT_START,27).toISOString(),"details":["El deposito deberá estar dividido en 3 grandes áreas. 1. Materia prima 2. Productos intermedios 3. Productos terminados. Las 3 áreas deberán estar perfectamente identificadas (los cuartitos del taller son depositos, donde se guarda el rulo en el taller tambien, los placares de diseño también, el piso de arriba obviamente tambien) En los depositos de bajo transito, deberá haber un listado de lo que hay (pedidos terminados deberá contener nombre de cliente, tipo de trabajo y cantidad). En los intermedios si son de un cliente lo mismo que el anterior, pero agregarle que proceso le falta para estar pronto. Los productos intermedios genericos (papel cortado, interior estándar etc) y la materia prima, debera constar la cantidad que hay en ese deposito, su stock minimo y maximo. Cada vez que se retira o ingresa parte del stock, deberá haber en la planilla un lugar para indicar la cantidad retirada, fecha y quien realizo el retiro. En caso de dar quiebre al stock minimo, se deberá dar aviso al encargado de reponer. Entregable: Fotos documentales del deposito donde este claro que tipo de deposito es y las planillas con las cantidades y lugar para marcar entrada y salida"]},
  {"code":"taller_productividad","name":"Medición de productividad","resp":"Taller","start":addDays(PROJECT_START,7).toISOString(),"end":addDays(PROJECT_START,13).toISOString(),"details":["Usar la definición de distintos tipos de tareas marcados en el P4. Establecer un lugar claro donde se pueda reportar: Fecha, hora de inicio, hora de fin, tarea realizada (del listado anterior), Numero de Pedido, Cantidad realizada. Poder sacar reportes de tiempos por tipo de tarea (divididos en tiempo de inicio (lectura de orden de trabajo, acomodo de la zona, busqueda de materiales, etc), tiempo de fin (limpieza, movimiento a la siguiente estacion etc), tiempo de trabajo). Poder sacar reportes por pedido Poder sacar reportes por persona."]},
  {"code":"taller_calidad","name":"Control de calidad","resp":"Taller","start":addDays(PROJECT_START,28).toISOString(),"end":addDays(PROJECT_START,34).toISOString(),"details":["Establecer puntos de control de calidad, que hay que revisar en cada uno, donde se registra"]},
  {"code":"taller_metodologia_de_trabajo","name":"Establecer una metodología de trabajo en 4 máquinas (las principales)","resp":"Taller","start":addDays(PROJECT_START,35).toISOString(),"end":addDays(PROJECT_START,41).toISOString(),"details":["Similar al realizado para la impresión en blanco y negro ricoh"]},
  {"code":"taller_zafrales","name":"Mejorar el manejo de zafrales/personal","resp":"Taller","start":addDays(PROJECT_START,7).toISOString(),"end":addDays(PROJECT_START,20).toISOString(),"details":["En conjunto con el plan de tareas y habilidades por persona y el de productividad, deberemos generar una metodología de trabajo que nos permita un optimo manejo de los zafrales jornaleros."]}
];

const recurBase: RecurItem[] = [
  {"code":"taller_reuniones_equipo","name":"Reuniones semanales entre líder y segundo con Fernando (Semanal)","freqDays":7,"nextAt":addDays(PROJECT_START,7).toISOString(),"history":[],"details":["Minuta semanal + agenda."]},
  {"code":"taller_1_a_1","name":"Reuniones 1 a 1 (Semanal)","freqDays":7,"nextAt":addDays(PROJECT_START,7).toISOString(),"history":[],"details":["Minuta y agenda de la siguiente reunión. Una por semana con un integrante diferente, al dar toda la vuelta, volver a comenzar."]},
  {"code":"taller_reuniones_de_equipo","name":"Reuniones de equipo mensuales (Cada 30 días)","freqDays":30,"nextAt":addDays(PROJECT_START,30).toISOString(),"history":[],"details":["Minuta y agenda de la siguiente reunión."]},
  {"code":"taller_reporte_interno_errores","name":"Reporte semanal de errores (Semanal)","freqDays":7,"nextAt":addDays(PROJECT_START,7).toISOString(),"history":[],"details":["Reporte con gráficas visibles del avance semana a semana"]},
  {"code":"taller_reporte_mma_errores","name":"Reporte mensual de errores (Cada 30 días)","freqDays":30,"nextAt":addDays(PROJECT_START,30).toISOString(),"history":[],"details":["Reporte a MMA con oportunidades de mejora en procesos de la empresa, para evitar repetir errores"]},
  {"code":"taller_reporte_productividad","name":"Reporte por tipo de tarea, por persona, por pedido (Semanal)","freqDays":7,"nextAt":addDays(PROJECT_START,7).toISOString(),"history":[],"details":["Reporte de productividad, que ayude en la toma de decisiones de zafrales. Que sea uan herramienta fundamental en la presupuestación."]},
  {"code":"taller_festejo","name":"Establecer un festejo mensual, sobre acciones reales que hayan sucedido. (Cada 30 días)","freqDays":30,"nextAt":addDays(PROJECT_START,30).toISOString(),"history":[],"details":["Resumen del festejo realizado y los motivos"]}

];

export default function Taller() {
  const weeks = React.useMemo(() => Array.from({ length: WEEKS }, (_, i) => addDays(PROJECT_START, i * 7)), []);

  const LS_KEY = "delegacion-ui-v7-taller";
  const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const saveState = (s: any) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

  const initial = React.useMemo(
    () =>
      loadState() ?? ({
        ones: oneBase.map((t) => ({ ...t, draftDrive: "", draftPdf: null, _draftPdfFile: null })),
        recs: recurBase.map((r) => ({ ...r, draftDrive: "", draftPdf: null, _draftPdfFile: null })),
      }),
    []
  );

  const [ones, setOnes] = React.useState<OneShot[]>(initial.ones);
  const [recs, setRecs] = React.useState<RecurItem[]>(initial.recs);
  const [open, setOpen] = React.useState<Record<string | number, boolean>>({});

  React.useEffect(() => {
    (async () => {
      try {
        const { data: onesRows } = await supabase.from("ones").select("*");
        const merged = oneBase.map((base) => {
          const row = onesRows?.find((r: any) => r.code === base.code);
          return {
            ...base,
            driveLink: row?.drive_link ?? undefined,
            pdf: row?.pdf_path ? { name: (row.pdf_path as string).split("/").pop() || "archivo.pdf", dataUrl: row.pdf_path } : undefined,
            uploadedAt: row?.uploaded_at ?? undefined,
            draftDrive: "", draftPdf: null, _draftPdfFile: null,
          };
        });
        setOnes(merged);
        const missingOnes = oneBase.filter((b) => !onesRows?.some((r: any) => r.code === b.code));
        if (missingOnes.length) {
          await supabase.from("ones").upsert(missingOnes.map((o) => ({ code: o.code, name: o.name, resp: o.resp, dep: o.dep ?? null, start: o.start, end: o.end, details: o.details })));
        }

        const { data: recRows } = await supabase.from("recs").select("*");
        const { data: histRows } = await supabase.from("rec_history").select("*").order("uploaded_at", { ascending: false });
        const mergedRecs = recurBase.map((base) => {
          const row = recRows?.find((r: any) => r.code === base.code);
          const hist = (histRows || []).filter((h: any) => h.rec_code === base.code);
          return {
            ...base,
            nextAt: row?.next_at ?? base.nextAt,
            draftDrive: "", draftPdf: null, _draftPdfFile: null,
            history: hist.map((h: any) => ({ promisedAt: h.promised_at, uploadedAt: h.uploaded_at, driveLink: h.drive_link, pdf: { name: (h.pdf_path as string).split("/").pop() || "archivo.pdf", dataUrl: h.pdf_path } })),
          };
        });
        setRecs(mergedRecs);
        const missingRecs = recurBase.filter((b) => !recRows?.some((r: any) => r.code === b.code));
        if (missingRecs.length) {
          await supabase.from("recs").upsert(missingRecs.map((r) => ({ code: r.code, name: r.name, freq_days: r.freqDays, next_at: r.nextAt })));
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  React.useEffect(() => saveState({ ones, recs }), [ones, recs]);

  const pickPdfOne = async (i: number, f: File | null) => { if (!f || f.type !== "application/pdf") return; if (f.size > 12*1024*1024) return alert("PDF muy grande (>12MB)."); const du = await fileToDataUrl(f); const copy = [...ones]; copy[i].draftPdf = { name: f.name, dataUrl: du }; copy[i]._draftPdfFile = f; setOnes(copy); };

  const submitOne = async (i: number) => {
    const t = ones[i]; if (!t._draftPdfFile || !t.draftDrive) return;
    try {
      const key = "taller/ones/" + t.code + "/" + Date.now() + "_" + t._draftPdfFile.name;
      const up = await uploadPdfToStorage(t._draftPdfFile, key);
      const now = new Date().toISOString();
      const { error } = await supabase.from("ones").upsert({ code: t.code, drive_link: t.draftDrive, pdf_path: up.publicUrl, uploaded_at: now });
      if (error) throw error;
      const copy = [...ones];
      copy[i] = { ...t, pdf: { name: t._draftPdfFile.name, dataUrl: up.publicUrl }, driveLink: t.draftDrive, uploadedAt: now, draftPdf: null, draftDrive: "", _draftPdfFile: null };
      setOnes(copy);
    } catch (e) { console.error(e); alert("Error subiendo/guardando."); }
  };

  const pickPdfRecur = async (i: number, f: File | null) => { if (!f || f.type !== "application/pdf") return; if (f.size > 12*1024*1024) return alert("PDF muy grande (>12MB)."); const du = await fileToDataUrl(f); const copy = [...recs]; copy[i].draftPdf = { name: f.name, dataUrl: du }; copy[i]._draftPdfFile = f; setRecs(copy); };

  const submitRecur = async (i: number) => {
    const r = recs[i]; if (!r._draftPdfFile || !r.draftDrive) return;
    try {
      const key = "taller/recs/" + r.code + "/" + Date.now() + "_" + r._draftPdfFile.name;
      const up = await uploadPdfToStorage(r._draftPdfFile, key);
      const now = new Date().toISOString();
      const { error: histErr } = await supabase.from("rec_history").insert({ rec_code: r.code, promised_at: r.nextAt, uploaded_at: now, drive_link: r.draftDrive, pdf_path: up.publicUrl });
      if (histErr) throw histErr;
      const next = addDays(new Date(r.nextAt), r.freqDays).toISOString();
      const { error: recErr } = await supabase.from("recs").upsert({ code: r.code, next_at: next, freq_days: r.freqDays });
      if (recErr) throw recErr;
      const copy = [...recs];
      copy[i].history = [{ promisedAt: r.nextAt, uploadedAt: now, driveLink: r.draftDrive, pdf: { name: r._draftPdfFile.name, dataUrl: up.publicUrl } }, ...copy[i].history];
      copy[i].nextAt = next; copy[i].draftDrive = ""; copy[i].draftPdf = null; copy[i]._draftPdfFile = null;
      setRecs(copy);
    } catch (e) { console.error(e); alert("Error subiendo/guardando."); }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="mx-auto max-w-[1400px] px-4 py-6 flex items-center gap-4">
        <img src="/diagonal.png" alt="Diagonal" className="h-7 w-auto" />
        <h1 className="text-2xl font-semibold">Taller – Coordinación</h1>
      </header>


      {/* Objetivo + Funciones clave */}
      <section className="mx-auto max-w-[1400px] px-4 mb-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              Objetivo
            </h3>
            <p className="text-neutral-200 mt-1">
              Coordinar todo el flujo productivo, asegurando que los trabajos
              tengan asignados recursos (MP, humanos y máquinas), tiempos y
              prioridades antes de entrar en producción. Mejorar el flujo de
              comunicación entre comercial y producción, e interno de la
              producción. Velar por el cumplimiento de la planificación y
              establecer gatillos de emergencia cuando no se cumple.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              Funciones clave
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-neutral-200">
              <li>
                <b>Ingreso y orden de trabajo:</b> centralizar pedidos; asignar
                procesos/actividades (personas y máquinas con tiempos); asignar
                fecha de entrega solicitada; clasificar por prioridad.
              </li>
              <li>
                <b>Verificación de viabilidad:</b> confirmar disponibilidad de
                papel y MP; revisar capacidad de máquinas y personal.
              </li>
              <li>
                <b>Asignación de recursos:</b> definir máquinas y terminaciones
                más eficientes (incluye tercerización si aplica); agrupar
                trabajos similares.
              </li>
              <li>
                <b>Definición de tiempos de entrega:</b> estimar tiempos reales
                + margen; estándar y express.
              </li>
              <li>
                <b>Seguimiento y ajuste:</b> reunión diaria de coordinación;
                ajustar ante urgencias o bloqueos.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              <a
                target="_blank"
                href="https://docs.google.com/document/d/1YriXyG9mRkxBuSuMWO1uXPZiAC8V8lTOz0_L-5YOaKc/edit?usp=sharing "
                rel="noreferrer"
              >
                Más detalles click acá
              </a>
            </h3>
          </div>
        </div>
      </section>



      <main className="mx-auto max-w-[1400px] px-4 pb-20">
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

        <section className="space-y-4">
          {ones.map((t, i) => {
            const locked = !!t.uploadedAt;
            const hasDrafts = !!t._draftPdfFile && !!t.draftDrive;
            const pdfUrl = t.pdf ? toPdfHref(t.pdf.dataUrl) : null;
            const sIdx = weekIndex(new Date(t.start));
            const eIdx = weekIndex(new Date(t.end));

            return (
              <div key={t.code} className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))} className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-neutral-700" title="Ver detalles">
                    <ChevronDown size={18} className={`transition-transform ${open[i] ? "rotate-180" : ""}`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold">{t.name}</h4>
                    <div className="mt-2 text-sm text-neutral-400">Inicio: {fmtDMY(new Date(t.start))} · Fin: {fmtDMY(new Date(t.end))}</div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-sm" style={{ color: brand, border: `1px solid ${brand}` }}>
                    Fecha objetivo: {fmtDMY(new Date(t.end))}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3 whitespace-nowrap overflow-x-auto flex-nowrap">
                  {locked ? (
                    <a className="h-10 w-[220px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700" href={pdfUrl!} download={t.pdf?.name} target="_blank" rel="noreferrer">
                      <Download size={18} /><span className="truncate">{t.pdf?.name}</span>
                    </a>
                  ) : (
                    <label className="h-10 w-[150px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700 cursor-pointer">
                      <Paperclip size={18} /><span className="truncate">{t.draftPdf?.name || "Adjuntar PDF"}</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => pickPdfOne(i, e.target.files?.[0] || null)} />
                    </label>
                  )}

                  {locked ? (
                    <a className="underline truncate w-[420px]" href={t.driveLink} target="_blank" rel="noreferrer">{t.driveLink}</a>
                  ) : (
                    <input className="h-10 w-[1020px] px-3 rounded-xl border bg-neutral-950 border-neutral-700 text-neutral-100 outline-none" placeholder="Link a Drive (cualquier link)" value={t.draftDrive || ""} onChange={(e) => { const copy = [...ones]; copy[i].draftDrive = e.target.value; setOnes(copy); }} />
                  )}

                  {!locked && (
                    <button onClick={() => submitOne(i)} disabled={!hasDrafts} className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${hasDrafts ? "text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"}`} style={{ background: hasDrafts ? brand : undefined }} title={hasDrafts ? "Subir" : "Adjuntá PDF y Link"}>
                      <Upload size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}>
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={idx} className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div className="h-full" style={{ background: idx >= sIdx && idx <= eIdx ? brand : "transparent" }} />
                      </div>
                    ))}
                  </div>
                </div>

                {open[i] && (
                  <div className="mt-3 text-sm text-neutral-300">
                    <h5 className="font-semibold mb-1">Detalles</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {t.details.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-semibold mb-3">Entregables recurrentes</h3>
          <div className="rounded-2xl overflow-hidden border border-neutral-800">
            {recs.map((r, idx) => {
              const key = `rec_${idx}`;
              const opened = !!open[key];
              const canSubmit = !!r._draftPdfFile && !!r.draftDrive;
              const last = r.history[0];

              return (
                <div key={r.code} className="border-t border-neutral-800 bg-neutral-900/40">
                  <div className="px-4 py-3 grid items-center gap-3" style={{ gridTemplateColumns: "40px 510px 100px 150px 310px 40px" }}>
                    <button onClick={() => setOpen((s) => ({ ...s, [key]: !s[key] }))} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-neutral-700" title="Ver detalles / historial">
                      <ChevronDown size={16} className={`transition-transform ${opened ? "rotate-180" : ""}`} />
                    </button>
                    <div className="font-medium leading-tight"><span className="line-clamp-2 break-words">{r.name}</span></div>
                    <div className="text-sm text-neutral-200 px-2 py-1 rounded-full border border-neutral-700 text-center">{fmtDMY(new Date(r.nextAt))}</div>
                    <label className="h-9 w-[150px] px-3 inline-flex items-center gap-2 rounded-xl border border-neutral-700 cursor-pointer">
                      <Paperclip size={16} /><span className="truncate">{r.draftPdf?.name || "Adjuntar PDF"}</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => pickPdfRecur(idx, e.target.files?.[0] || null)} />
                    </label>
                    <input className="h-9 w-[310px] px-3 rounded-xl border bg-neutral-950 border-neutral-700 text-neutral-100 outline-none" placeholder={last ? last.driveLink : "https://drive.google.com/..."} value={r.draftDrive || ""} onChange={(e) => { const copy = [...recs]; copy[idx].draftDrive = e.target.value; setRecs(copy); }} />
                    <button onClick={() => submitRecur(idx)} disabled={!canSubmit} className={`h-9 w-9 rounded-xl inline-flex items-center justify-center ${canSubmit ? "text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"}`} style={{ background: canSubmit ? brand : undefined }} title={canSubmit ? "Subir" : "Adjuntá PDF y Link"}>
                      <Upload size={16} />
                    </button>
                  </div>

                  {opened && (
                    <div className="px-4 pb-4">
                      {r.details?.length ? (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 mb-3">
                          <div className="text-sm font-semibold mb-1" style={{ color: brand }}>Detalles</div>
                          <ul className="list-disc pl-5 text-sm space-y-1">{r.details.map((d) => <li key={d}>{d}</li>)}</ul>
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
                              <div key={j} className="grid grid-cols-[140px_160px_1fr_1fr] gap-2 px-3 py-2 border-t border-neutral-800 items-center">
                                <div className="text-center">{fmtDMY(new Date(h.promisedAt))}</div>
                                <div className="text-center">{fmtDMY(new Date(h.uploadedAt))}</div>
                                <a className="underline truncate" href={href} download={h.pdf.name} target="_blank" rel="noreferrer">{h.pdf.name}</a>
                                <a className="underline truncate" href={h.driveLink} target="_blank" rel="noreferrer">{h.driveLink}</a>
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
