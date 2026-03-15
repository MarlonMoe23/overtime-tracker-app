import React, { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { supabase } from '../lib/supabase';
import * as XLSX from "xlsx-js-style";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

// ─── Google Fonts ─────────────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('ot-fonts')) {
  const link = document.createElement("link");
  link.id = 'ot-fonts';
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=Oswald:wght@600;700&display=swap";
  document.head.appendChild(link);
}

// ─── Estilos globales ─────────────────────────────────────────────────────────
const CSS = `
  .ot-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background: #0f1117;
    color: #e8eaf0;
    padding: 24px 16px 60px;
  }
  .ot-header { text-align: center; margin-bottom: 36px; }
  .ot-eyebrow {
    font-family: 'Syne', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: #5b6aff; margin-bottom: 8px;
  }
  .ot-header h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(26px,5vw,38px); font-weight: 800;
    color: #fff; margin: 0; line-height: 1.1;
  }
  .ot-header-line {
    width: 40px; height: 3px; background: #5b6aff;
    margin: 14px auto 0; border-radius: 2px;
  }
  .ot-card {
    background: #181c27; border: 1px solid #252a3a;
    border-radius: 16px; padding: 28px 24px;
    max-width: 500px; margin: 0 auto 20px;
  }
  .ot-section-label {
    font-family: 'Syne', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #5b6aff; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .ot-section-label::after {
    content: ''; flex: 1; height: 1px; background: #252a3a;
  }
  .ot-field { margin-bottom: 18px; }
  .ot-label {
    display: block; font-size: 12px; font-weight: 500;
    color: #8892aa; margin-bottom: 7px; letter-spacing: 0.03em;
  }
  .ot-input, .ot-select, .ot-textarea {
    width: 100%; background: #0f1117;
    border: 1px solid #252a3a; border-radius: 10px;
    padding: 11px 14px;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    color: #e8eaf0; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none; appearance: none;
  }
  .ot-input:focus, .ot-select:focus, .ot-textarea:focus {
    border-color: #5b6aff; box-shadow: 0 0 0 3px rgba(91,106,255,0.12);
  }
  .ot-input.error { border-color: #ff5b5b; }
  .ot-textarea { resize: none; line-height: 1.5; }
  .ot-select option { background: #181c27; }
  .ot-row { display: flex; gap: 12px; }
  .ot-row > * { flex: 1; min-width: 0; }
  .ot-char-count { text-align: right; font-size: 11px; color: #4a5268; margin-top: 5px; }
  .ot-error-msg { font-size: 12px; color: #ff7070; margin-top: 6px; }
  .ot-btn {
    width: 100%; padding: 13px 20px; border-radius: 10px;
    font-family: 'Syne', sans-serif; font-size: 14px;
    font-weight: 700; letter-spacing: 0.04em;
    cursor: pointer; border: none;
    transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .ot-btn-primary { background: #5b6aff; color: #fff; }
  .ot-btn-primary:hover:not(:disabled) { background: #4a58f0; transform: translateY(-1px); }
  .ot-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .ot-btn-export {
    background: #1a2235; color: #7dd3a8; border: 1px solid #243040;
  }
  .ot-btn-export:hover { background: #1f2a40; }
  .ot-btn-export-all {
    background: #1a2235; color: #7dd3fc; border: 1px solid #243040;
  }
  .ot-btn-export-all:hover { background: #1f2a40; }
  .ot-btn-danger {
    background: transparent; color: #ff7070; border: 1px solid #3a1a1a; width: 100%;
    padding: 13px 20px; border-radius: 10px;
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .ot-btn-danger:hover { background: #1f1010; border-color: #ff5b5b; }
  .ot-edit-banner {
    display: flex; align-items: center; gap: 10px;
    background: #1f1a00; border: 1px solid #4a3a00;
    border-radius: 10px; padding: 12px 14px;
    margin-bottom: 20px; font-size: 13px; color: #ffd966;
  }
  .ot-edit-banner button {
    margin-left: auto; background: none; border: none;
    color: #ffd966; font-size: 12px; cursor: pointer; text-decoration: underline; padding: 0;
  }
  .ot-viz-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; flex-wrap: wrap;
    gap: 12px; margin-bottom: 20px;
  }
  .ot-viz-title {
    font-family: 'Syne', sans-serif; font-size: 18px;
    font-weight: 700; color: #fff; margin: 0 0 2px;
  }
  .ot-viz-subtitle { font-size: 12px; color: #4a5268; }
  .ot-total-pill {
    background: rgba(91,106,255,0.12); border: 1px solid rgba(91,106,255,0.25);
    border-radius: 30px; padding: 8px 16px; text-align: center; white-space: nowrap;
  }
  .ot-total-pill span {
    display: block; font-size: 10px; color: #5b6aff;
    font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2px;
  }
  .ot-total-pill strong {
    font-family: 'Oswald', sans-serif; font-size: 22px; font-weight: 700; color: #fff;
    letter-spacing: 0.05em;
  }
  .ot-filter-row { display: flex; gap: 10px; margin-bottom: 20px; }
  .ot-filter-row > * { flex: 1; }
  .ot-record {
    background: #0f1117; border: 1px solid #252a3a;
    border-radius: 12px; padding: 16px; margin-bottom: 10px; transition: border-color 0.15s;
  }
  .ot-record.editing { border-color: #ffd966; box-shadow: 0 0 0 2px rgba(255,217,102,0.1); }
  .ot-record-top {
    display: flex; justify-content: space-between;
    align-items: flex-start; gap: 8px; margin-bottom: 10px;
  }
  .ot-record-dates { font-size: 13px; color: #8892aa; line-height: 1.8; }
  .ot-record-dates strong { color: #e8eaf0; font-weight: 500; }
  .ot-record-hours {
    font-family: 'Oswald', sans-serif; font-size: 24px;
    font-weight: 700; color: #5b6aff; white-space: nowrap; text-align: right;
    letter-spacing: 0.05em;
  }
  .ot-record-hours span {
    display: block; font-size: 10px; font-weight: 600; color: #4a5268; margin-top: -2px;
  }
  .ot-record-desc {
    font-size: 13px; color: #6b7590;
    border-top: 1px solid #1e2333; padding-top: 10px; margin-top: 4px;
  }
  .ot-record-actions { display: flex; gap: 8px; margin-top: 12px; }
  .ot-record-btn {
    flex: 1; padding: 7px 12px; border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid;
    display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.15s;
  }
  .ot-record-btn-edit { background: transparent; color: #ffd966; border-color: #3a2e00; }
  .ot-record-btn-edit:hover { background: #1f1a00; }
  .ot-record-btn-delete { background: transparent; color: #ff7070; border-color: #3a1a1a; }
  .ot-record-btn-delete:hover { background: #1f1010; }
  .ot-empty { text-align: center; padding: 40px 20px; color: #4a5268; font-size: 14px; }
  .ot-empty-icon { font-size: 32px; margin-bottom: 10px; }
  .ot-danger-zone { border: 1px solid #2a1515; border-radius: 12px; padding: 20px; margin-top: 8px; }
  .ot-danger-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
    text-transform: uppercase; color: #7a3030; text-align: center; margin-bottom: 14px;
  }
  .ot-toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #1f2535; border: 1px solid #2e3550; color: #e8eaf0;
    padding: 12px 24px; border-radius: 30px; font-size: 13px; font-weight: 500;
    z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,0.4); white-space: nowrap;
  }
  .ot-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px;
  }
  .ot-modal {
    background: #181c27; border: 1px solid #252a3a;
    border-radius: 16px; padding: 28px; max-width: 380px; width: 100%;
  }
  .ot-modal h3 {
    font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700;
    color: #fff; margin: 0 0 8px;
  }
  .ot-modal p { font-size: 13px; color: #8892aa; line-height: 1.6; margin: 0 0 18px; }
  .ot-modal-actions { display: flex; gap: 10px; }
  .ot-modal-cancel {
    flex: 1; padding: 12px; border-radius: 10px;
    background: #1a1e2e; border: 1px solid #252a3a; color: #8892aa;
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: background 0.15s;
  }
  .ot-modal-cancel:hover { background: #1f2535; }
  .ot-modal-confirm {
    flex: 1; padding: 12px; border-radius: 10px;
    background: transparent; border: 1px solid #3a1a1a; color: #ff7070;
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
  }
  .ot-modal-confirm:hover { background: #1f1010; border-color: #ff5b5b; }
  .react-datepicker { background: #181c27 !important; border: 1px solid #252a3a !important; font-family: 'DM Sans', sans-serif !important; border-radius: 12px !important; color: #e8eaf0 !important; }
  .react-datepicker__header { background: #0f1117 !important; border-bottom: 1px solid #252a3a !important; border-radius: 12px 12px 0 0 !important; }
  .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker-time__header { color: #8892aa !important; font-size: 12px !important; }
  .react-datepicker__day { color: #e8eaf0 !important; border-radius: 6px !important; }
  .react-datepicker__day:hover { background: #252a3a !important; }
  .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background: #5b6aff !important; color: #fff !important; }
  .react-datepicker__day--disabled { color: #3a4055 !important; }
  .react-datepicker__time-container { border-left: 1px solid #252a3a !important; }
  .react-datepicker__time { background: #181c27 !important; }
  .react-datepicker__time-list-item { color: #e8eaf0 !important; }
  .react-datepicker__time-list-item:hover { background: #252a3a !important; }
  .react-datepicker__time-list-item--selected { background: #5b6aff !important; color: #fff !important; }
  .react-datepicker__navigation-icon::before { border-color: #8892aa !important; }
  .react-datepicker__triangle { display: none !important; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ot-animate { animation: fadeUp 0.3s ease both; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ot-styles')) {
  const style = document.createElement('style');
  style.id = 'ot-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    if (message) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }
  }, [message, onClose]);
  if (!message) return null;
  return <div className="ot-toast">{message}</div>;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, description, inputLabel, inputPlaceholder, expectedValue, onConfirm, onCancel }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setValue(""); setError(""); } }, [open]);
  if (!open) return null;
  function handleConfirm() {
    if (expectedValue !== undefined && value !== expectedValue) { setError("Código incorrecto."); return; }
    onConfirm();
  }
  return (
    <div className="ot-modal-overlay">
      <div className="ot-modal ot-animate">
        <h3>{title}</h3>
        <p>{description}</p>
        {inputLabel && (
          <div style={{ marginBottom: 18 }}>
            <label className="ot-label">{inputLabel}</label>
            <input
              className={`ot-input${error ? ' error' : ''}`}
              placeholder={inputPlaceholder} value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
            {error && <p className="ot-error-msg">{error}</p>}
          </div>
        )}
        <div className="ot-modal-actions">
          <button className="ot-modal-cancel" onClick={onCancel}>Cancelar</button>
          <button className="ot-modal-confirm" onClick={handleConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Datos ────────────────────────────────────────────────────────────────────
const technicians = [
  "Alex Haro","Angelo Porras","Carlos Cisneros","César Sánchez","Dario Ojeda",
  "Edgar Ormaza","Israel Pérez","José Urquizo","Juan Carrión","Kevin Vargas",
  "Miguel Lozada","Roberto Córdova","Edisson Bejarano","Leonardo Ballesteros","Marlon Ortiz",
];
const monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d) { return d ? format(new Date(d), "dd/MM/yyyy HH:mm") : ""; }

function calcHours(start, end) {
  if (!start || !end) return { hhmm: "00:00", decimal: "0.0h" };
  const diff = new Date(end) - new Date(start);
  if (diff < 0) return { hhmm: "00:00", decimal: "0.0h" };
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return { hhmm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, decimal: `${(totalMin/60).toFixed(1)}h` };
}

function autoFitColumns(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || cell.v == null) continue;
      const len = String(cell.v).length;
      if (len > maxLen) maxLen = len;
    }
    colWidths.push({ wch: maxLen + 2 });
  }
  ws['!cols'] = colWidths;
  return ws;
}

function centerWorksheet(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        ...(R === 0 ? { font: { bold: true } } : {})
      };
    }
  }
  return ws;
}

function buildAdminRows(records) {
  const rows = [];
  records.forEach(r => {
    let start = new Date(r.start_time);
    const end = new Date(r.end_time);
    while (start < end) {
      const midnight = new Date(start); midnight.setHours(24,0,0,0);
      const segEnd = end < midnight ? end : midnight;
      const pad = n => String(n).padStart(2,"0");
      rows.push({ "Tecnico": r.name, "Mes": monthNames[start.getMonth()], "Año": start.getFullYear(), "Dia del Mes": start.getDate(), "Hora Inicio": `${pad(start.getHours())}:${pad(start.getMinutes())}`, "Hora Final": `${pad(segEnd.getHours())}:${pad(segEnd.getMinutes())}`, "Horas": Number(((segEnd-start)/3600000).toFixed(2)) });
      start = segEnd;
    }
  });
  return rows;
}

// ─── CustomInput DatePicker ───────────────────────────────────────────────────
const CustomInput = forwardRef(function CustomInput({ value, onClick, placeholder, ariaLabel }, ref) {
  return <input ref={ref} readOnly value={value} onClick={onClick} placeholder={placeholder} aria-label={ariaLabel} className="ot-input" style={{ cursor: 'pointer' }} />;
});
CustomInput.displayName = "CustomInput";

// ─── Iconos ───────────────────────────────────────────────────────────────────
const IconEdit = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>;
const IconTrash = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z"/></svg>;
const IconDownload = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OvertimeForm() {
  const [selectedName, setSelectedName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [workDescription, setWorkDescription] = useState("");
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState("");
  const [totalHours, setTotalHours] = useState({ hhmm: "00:00", decimal: "0.0h" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorStartEnd, setErrorStartEnd] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [deleteRecordModal, setDeleteRecordModal] = useState({ open: false, id: null });

  const listRef = useRef(null);
  const startInputRef = useRef(null);
  const formFieldsRef = useRef(null);

  useEffect(() => {
    const now = new Date();
    setStartTime(new Date(now.getTime() - 2*3600000));
    setEndTime(now);
  }, []);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isClient) {
      setSelectedName(localStorage.getItem("lastTechnician") || "");
      setSelectedMonth(Number(localStorage.getItem("lastMonth")) || new Date().getMonth() + 1);
      setSelectedYear(Number(localStorage.getItem("lastYear")) || new Date().getFullYear());
    }
  }, [isClient]);

  const showToast = useCallback((msg) => setToast(msg), []);

  const fetchRecords = useCallback(async (name, month, year) => {
    setLoading(true);
    const startOfMonth = `${year}-${String(month).padStart(2,"0")}-01T00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const startOfNext = `${endYear}-${String(endMonth).padStart(2,"0")}-01T00:00:00`;
    const { data, error } = await supabase
      .from('overtime_records').select('*').eq('name', name)
      .gte('start_time', startOfMonth).lt('start_time', startOfNext)
      .order('start_time', { ascending: false });
    if (error) { showToast("Error al cargar registros"); setRecords([]); }
    else setRecords(data);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (selectedName) {
      localStorage.setItem("lastTechnician", selectedName);
      localStorage.setItem("lastMonth", selectedMonth);
      localStorage.setItem("lastYear", selectedYear);
      fetchRecords(selectedName, selectedMonth, selectedYear);
    } else {
      setRecords([]);
      setTotalHours({ hhmm: "00:00", decimal: "0.0h" });
    }
  }, [selectedName, selectedMonth, selectedYear, fetchRecords]);

  useEffect(() => {
    if (records.length > 0) {
      let totalMin = 0;
      records.forEach(r => { const diff = new Date(r.end_time) - new Date(r.start_time); if (diff > 0) totalMin += Math.floor(diff/60000); });
      const h = Math.floor(totalMin/60), m = totalMin%60;
      setTotalHours({ hhmm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, decimal: `${(totalMin/60).toFixed(1)}h` });
    } else { setTotalHours({ hhmm: "00:00", decimal: "0.0h" }); }
  }, [records]);

  useEffect(() => {
    if (startTime && endTime && startTime >= endTime) setErrorStartEnd("La hora de inicio debe ser antes que la de fin.");
    else setErrorStartEnd("");
  }, [startTime, endTime]);

  async function handleSave() {
    if (!selectedName || !startTime || !endTime || !workDescription.trim()) { showToast('⚠️ Completa todos los campos.'); return; }
    if (startTime >= endTime) { showToast('⚠️ Revisa las horas.'); return; }
    setSaving(true);
    const startLocal = format(startTime, "yyyy-MM-dd'T'HH:mm:ss");
    const endLocal = format(endTime, "yyyy-MM-dd'T'HH:mm:ss");
    try {
      if (editingId) {
        const { error } = await supabase.from('overtime_records').update({ start_time: startLocal, end_time: endLocal, work_description: workDescription }).eq('id', editingId);
        if (error) throw error;
        showToast('Registro actualizado ✅'); setEditingId(null);
      } else {
        const { error } = await supabase.from('overtime_records').insert([{ name: selectedName, start_time: startLocal, end_time: endLocal, work_description: workDescription }]);
        if (error) throw error;
        showToast('¡Registro guardado!');
      }
      await fetchRecords(selectedName, selectedMonth, selectedYear);
      resetForm();
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (e) { showToast('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  function handleEdit(record) {
    setEditingId(record.id); setStartTime(new Date(record.start_time)); setEndTime(new Date(record.end_time));
    setWorkDescription(record.work_description || ""); setDescriptionLength(record.work_description?.length || 0);
    setTimeout(() => { formFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); startInputRef.current?.focus(); }, 200);
  }

  async function handleDeleteRecord(id) {
    const { error } = await supabase.from('overtime_records').delete().eq('id', id);
    if (error) showToast('Error: ' + error.message);
    else { showToast('Registro eliminado 🗑️'); await fetchRecords(selectedName, selectedMonth, selectedYear); }
  }

  async function handleExportAll() {
    const { data, error } = await supabase.from('overtime_records').select('*');
    if (error) { showToast('Error: ' + error.message); return; }
    if (!data?.length) { showToast('No hay datos.'); return; }
    const sorted = [...data].sort((a,b) => a.name===b.name ? new Date(a.start_time)-new Date(b.start_time) : a.name.localeCompare(b.name));
    const ws1 = autoFitColumns(centerWorksheet(XLSX.utils.json_to_sheet(sorted.map(r => ({ 'Técnico': r.name, 'Inicio': new Date(r.start_time), 'Fin': new Date(r.end_time), 'Descripción': r.work_description||'Sin descripción', 'Horas': (new Date(r.end_time)-new Date(r.start_time))/3600000 })), { cellDates: true })));
    const ws2 = autoFitColumns(centerWorksheet(XLSX.utils.json_to_sheet(buildAdminRows(sorted))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Horas Extras');
    XLSX.utils.book_append_sheet(wb, ws2, 'Formato Admin');
    XLSX.writeFile(wb, 'horas_extras.xlsx');
    showToast('Exportado 📁');
  }

  async function handleExportSingle() {
    if (!selectedName) { showToast('Selecciona un técnico.'); return; }
    const { data, error } = await supabase.from('overtime_records').select('*').eq('name', selectedName).order('start_time', { ascending: true });
    if (error) { showToast('Error: ' + error.message); return; }
    if (!data?.length) { showToast('No hay datos.'); return; }
    const ws = autoFitColumns(centerWorksheet(XLSX.utils.json_to_sheet(buildAdminRows(data))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formato Admin');
    XLSX.writeFile(wb, `horas_extras_${selectedName.replace(/ /g,'_')}.xlsx`);
    showToast(`Exportado: ${selectedName} 📁`);
  }

  async function handleDeleteAll() {
    const { error } = await supabase.from('overtime_records').delete().neq('id', 0);
    if (error) showToast('Error: ' + error.message);
    else { showToast('Base de datos limpiada'); setRecords([]); setTotalHours({ hhmm: "00:00", decimal: "0.0h" }); }
  }

  function resetForm() {
    const now = new Date();
    setStartTime(new Date(now.getTime()-2*3600000)); setEndTime(now);
    setWorkDescription(''); setDescriptionLength(0); setEditingId(null);
  }

  const handleDescChange = (e) => {
    const t = e.target.value;
    if (t.length <= 70) { setWorkDescription(t); setDescriptionLength(t.length); }
  };

  const popperModifiers = [
    { name: "preventOverflow", options: { boundary: "viewport", rootBoundary: "viewport", tether: false } },
    { name: "flip", enabled: true },
  ];

  const isSaveDisabled = !!errorStartEnd || !selectedName || !startTime || !endTime || !workDescription.trim() || saving;

  return (
    <div className="ot-root">
      <Toast message={toast} onClose={() => setToast("")} />
      <ConfirmModal
        open={deleteRecordModal.open} title="¿Borrar este registro?"
        description="Esta acción no se puede deshacer."
        onConfirm={() => { handleDeleteRecord(deleteRecordModal.id); setDeleteRecordModal({ open: false, id: null }); }}
        onCancel={() => setDeleteRecordModal({ open: false, id: null })}
      />
      <ConfirmModal
        open={deleteAllModal} title="¿Borrar toda la base de datos?"
        description="Se eliminarán TODOS los registros de TODOS los técnicos. Irreversible."
        inputLabel="Código de seguridad" inputPlaceholder="Código..." expectedValue="23"
        onConfirm={() => { handleDeleteAll(); setDeleteAllModal(false); }}
        onCancel={() => setDeleteAllModal(false)}
      />

      {/* Header */}
      <div className="ot-header ot-animate">
        <div className="ot-eyebrow">Sistema de Control</div>
        <h1>Horas Extras</h1>
        <div className="ot-header-line"></div>
      </div>

      {/* Formulario de ingreso */}
      <div className="ot-card ot-animate" ref={formFieldsRef}>
        <div className="ot-section-label">Nuevo Registro</div>

        {editingId && (
          <div className="ot-edit-banner">
            <IconEdit />
            <span>Modo edición activo</span>
            <button onClick={resetForm}>Cancelar</button>
          </div>
        )}

        <div className="ot-field">
          <label className="ot-label">Técnico</label>
          <select className="ot-select" value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
            <option value="">Seleccione un técnico</option>
            {technicians.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="ot-field">
          <label className="ot-label">Hora de Inicio</label>
          <DatePicker
            selected={startTime} onChange={setStartTime}
            showTimeSelect timeFormat="HH:mm" timeIntervals={1}
            dateFormat="dd/MM/yyyy HH:mm" maxDate={new Date()}
            placeholderText="Fecha inicio"
            customInput={<CustomInput ref={startInputRef} ariaLabel="Hora de Inicio" />}
            popperPlacement="bottom" popperModifiers={popperModifiers}
          />
        </div>
        <div className="ot-field">
          <label className="ot-label">Hora de Fin</label>
          <DatePicker
            selected={endTime} onChange={setEndTime}
            showTimeSelect timeFormat="HH:mm" timeIntervals={1}
            dateFormat="dd/MM/yyyy HH:mm" maxDate={new Date()}
            placeholderText="Fecha fin"
            customInput={<CustomInput ariaLabel="Hora de Fin" />}
            popperPlacement="bottom" popperModifiers={popperModifiers}
          />
        </div>
        {errorStartEnd && <p className="ot-error-msg" style={{ marginTop: -10, marginBottom: 12 }}>{errorStartEnd}</p>}

        <div className="ot-field">
          <label className="ot-label">Descripción del trabajo</label>
          <textarea
            className="ot-textarea" rows={3}
            value={workDescription} onChange={handleDescChange}
            placeholder="Ej: Limpieza de filtros U1 y U2, revisión de válvulas..."
            maxLength={70}
          />
          <div className="ot-char-count">{descriptionLength}/70</div>
        </div>

        <button className="ot-btn ot-btn-primary" disabled={isSaveDisabled} onClick={handleSave}>
          {saving
            ? <svg style={{width:18,height:18,animation:'spin 1s linear infinite'}} fill="none" viewBox="0 0 24 24"><circle opacity=".25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity=".75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            : (editingId ? "Actualizar Registro" : "Guardar Registro")}
        </button>
      </div>

      {/* Visualización — solo aparece si hay técnico seleccionado */}
      {selectedName && (
        <div className="ot-card ot-animate" ref={listRef}>
          <div className="ot-section-label">Registros</div>

          <div className="ot-viz-header">
            <div>
              <div className="ot-viz-title">{selectedName}</div>
              <div className="ot-viz-subtitle">{monthNames[selectedMonth - 1]} {selectedYear}</div>
            </div>
            <div className="ot-total-pill">
              <span>Total</span>
              <strong>{totalHours.hhmm}</strong>
            </div>
          </div>

          {/* Selectores de Mes y Año — aquí, en visualización */}
          <div className="ot-filter-row">
            <div>
              <label className="ot-label">Mes</label>
              <select className="ot-select" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="ot-label">Año</label>
              <select className="ot-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ot-empty"><div style={{color:'#5b6aff'}}>Cargando...</div></div>
          ) : records.length === 0 ? (
            <div className="ot-empty">
              <div className="ot-empty-icon">📋</div>
              <div>Sin registros para {monthNames[selectedMonth-1]} {selectedYear}</div>
            </div>
          ) : (
            records.map((r, idx) => {
              const { hhmm, decimal } = calcHours(r.start_time, r.end_time);
              return (
                <div key={r.id} className={`ot-record ot-animate${editingId === r.id ? ' editing' : ''}`} style={{ animationDelay: `${idx*40}ms` }}>
                  <div className="ot-record-top">
                    <div className="ot-record-dates">
                      <div><strong>Inicio</strong> &nbsp;{formatDate(r.start_time)}</div>
                      <div><strong>Fin</strong> &nbsp;&nbsp;&nbsp;&nbsp;{formatDate(r.end_time)}</div>
                    </div>
                    <div className="ot-record-hours">{hhmm}<span>{decimal}</span></div>
                  </div>
                  {r.work_description && <div className="ot-record-desc">{r.work_description}</div>}
                  <div className="ot-record-actions">
                    <button className="ot-record-btn ot-record-btn-edit" onClick={() => handleEdit(r)}><IconEdit /> Editar</button>
                    <button className="ot-record-btn ot-record-btn-delete" onClick={() => setDeleteRecordModal({ open: true, id: r.id })}><IconTrash /> Borrar</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Exportar */}
      <div className="ot-card ot-animate" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div className="ot-section-label">Exportar</div>
        {selectedName && (
          <button className="ot-btn ot-btn-export" onClick={handleExportSingle}>
            <IconDownload /> Exportar mis horas ({selectedName.split(' ')[0]})
          </button>
        )}
        <button className="ot-btn ot-btn-export-all" onClick={handleExportAll}>
          <IconDownload /> Exportar Excel completo
        </button>
        <div className="ot-danger-zone">
          <div className="ot-danger-label">⚠ Zona de peligro</div>
          <button className="ot-btn-danger" onClick={() => setDeleteAllModal(true)}>
            <IconTrash /> Borrar base de datos
          </button>
        </div>
      </div>
    </div>
  );
}