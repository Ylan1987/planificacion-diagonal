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
  {"code":"taller_cap","name":"Matriz de capacidades por máquina","resp":"Taller","start":addDays(PROJECT_START,0).toISOString(),"end":addDays(PROJECT_START,13).toISOString(),"details":["Hoja con capacidades y límites."]},
  {"code":"taller_mant","name":"Plan de mantenimiento preventivo","resp":"Taller","start":addDays(PROJECT_START,14).toISOString(),"end":addDays(PROJECT_START,34).toISOString(),"details":["Calendario + responsables."]},
  {"code":"taller_layout","name":"Optimización de layout del taller","resp":"Taller","start":addDays(PROJECT_START,35).toISOString(),"end":addDays(PROJECT_START,56).toISOString(),"details":["Propuesta de mejora de flujos."]}
];

const recurBase: RecurItem[] = [
  {"code":"taller_min_prod","name":"Minuta reunión de Producción (Semanal)","freqDays":7,"nextAt":addDays(PROJECT_START,7).toISOString(),"history":[],"details":["Minuta semanal + agenda."]},
  {"code":"taller_5s","name":"Checklist de seguridad 5S (Quincenal)","freqDays":15,"nextAt":addDays(PROJECT_START,15).toISOString(),"history":[],"details":["Evidencias y pendientes 5S."]},
  {"code":"taller_mant_mensual","name":"Revisión mensual de mantenimiento (Cada 30 días)","freqDays":30,"nextAt":addDays(PROJECT_START,30).toISOString(),"history":[],"details":["Estado de mantenimiento y repuestos."]}
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
