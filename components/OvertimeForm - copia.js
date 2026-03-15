import React, { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { supabase } from '../lib/supabase';
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded shadow-lg z-50">
      {message}
    </div>
  );
}

// ─── Modal de confirmación ────────────────────────────────────────────────────
function ConfirmModal({ open, title, description, inputLabel, inputPlaceholder, expectedValue, onConfirm, onCancel }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setValue(""); setError(""); }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (expectedValue !== undefined && value !== expectedValue) {
      setError("Código incorrecto. Inténtalo de nuevo.");
      return;
    }
    onConfirm();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-full p-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 text-sm">{description}</p>
        {inputLabel && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{inputLabel}</label>
            <input
              type="text"
              className={`shadow border rounded w-full py-2 px-3 text-gray-700 ${error ? 'border-red-500' : ''}`}
              placeholder={inputPlaceholder}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded transition"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
            onClick={handleConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Datos ────────────────────────────────────────────────────────────────────
const technicians = [
  "Alex Haro",
  "Angelo Porras",
  "Carlos Cisneros",
  "César Sánchez",
  "Dario Ojeda",
  "Edgar Ormaza",
  "Israel Pérez",
  "José Urquizo",
  "Juan Carrión",
  "Kevin Vargas",
  "Miguel Lozada",
  "Roberto Córdova",
  "Edisson Bejarano",
  "Leonardo Ballesteros",
  "Marlon Ortiz",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateString) {
  if (!dateString) return "";
  return format(new Date(dateString), "dd/MM/yyyy HH:mm");
}

function calculateHours(start, end) {
  if (!start || !end) return "00:00 / 0.0";
  const diffMs = new Date(end) - new Date(start);
  if (diffMs < 0) return "00:00 / 0.0";
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} / ${(totalMinutes / 60).toFixed(1)}`;
}

// ✅ Función reutilizable — evita código duplicado en los dos exports
function buildAdminRows(records) {
  const rows = [];
  records.forEach(r => {
    let start = new Date(r.start_time);
    const end = new Date(r.end_time);
    while (start < end) {
      const midnight = new Date(start);
      midnight.setHours(24, 0, 0, 0);
      const segmentEnd = end < midnight ? end : midnight;
      const diffHours = (segmentEnd - start) / (1000 * 60 * 60);
      const pad = (n) => String(n).padStart(2, "0");
      rows.push({
        "Tecnico": r.name,
        "Dia del Mes": start.getDate(),
        "Hora Inicio": `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        "Hora Final": `${pad(segmentEnd.getHours())}:${pad(segmentEnd.getMinutes())}`,
        "Horas": Number(diffHours.toFixed(2))
      });
      start = segmentEnd;
    }
  });
  return rows;
}

// ─── CustomInput para DatePicker ──────────────────────────────────────────────
const CustomInput = forwardRef(function CustomInput({ value, onClick, onChange, onFocus, placeholder, ariaLabel }, ref) {
  return (
    <input
      ref={ref}
      value={value}
      onClick={onClick}
      onChange={onChange}
      onFocus={onFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="shadow border rounded w-full py-2 px-3 text-gray-700"
      readOnly
    />
  );
});
CustomInput.displayName = "CustomInput";

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OvertimeForm() {
  const [selectedName, setSelectedName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [workDescription, setWorkDescription] = useState("");
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState("");
  const [totalHours, setTotalHours] = useState("00:00 / 0.0");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorStartEnd, setErrorStartEnd] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Modal state
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [deleteRecordModal, setDeleteRecordModal] = useState({ open: false, id: null });

  const listRef = useRef(null);
  const startInputRef = useRef(null);
  const formRef = useRef(null);
  const formFieldsRef = useRef(null);

  useEffect(() => {
    const now = new Date();
    setStartTime(new Date(now.getTime() - 2 * 60 * 60 * 1000));
    setEndTime(now);
  }, []);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isClient) setSelectedName(localStorage.getItem("lastTechnician") || "");
  }, [isClient]);

  const showToast = useCallback((msg) => setToast(msg), []);

  const fetchRecords = useCallback(async (name) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('overtime_records')
      .select('*')
      .eq('name', name)
      .order('start_time', { ascending: false });
    if (error) { showToast("Error al cargar registros"); setRecords([]); }
    else setRecords(data);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (selectedName) {
      localStorage.setItem("lastTechnician", selectedName);
      fetchRecords(selectedName);
    } else {
      setRecords([]);
      setTotalHours("00:00 / 0.0");
    }
  }, [selectedName, fetchRecords]);

  useEffect(() => {
    if (records.length > 0) {
      let totalMinutes = 0;
      records.forEach(r => {
        const diff = new Date(r.end_time) - new Date(r.start_time);
        if (diff > 0) totalMinutes += Math.floor(diff / (1000 * 60));
      });
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setTotalHours(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} / ${(totalMinutes / 60).toFixed(1)}`);
    } else {
      setTotalHours("00:00 / 0.0");
    }
  }, [records]);

  useEffect(() => {
    if (startTime && endTime && startTime >= endTime)
      setErrorStartEnd("La hora de inicio debe ser antes que la de fin.");
    else
      setErrorStartEnd("");
  }, [startTime, endTime]);

  async function handleSave() {
    if (!selectedName || !startTime || !endTime || workDescription.trim() === "") {
      showToast('⚠️ Completa todos los campos obligatorios.');
      return;
    }
    if (startTime >= endTime) { showToast('⚠️ La hora de inicio debe ser antes que la de fin.'); return; }

    setSaving(true);
    const startLocal = format(startTime, "yyyy-MM-dd'T'HH:mm:ss");
    const endLocal = format(endTime, "yyyy-MM-dd'T'HH:mm:ss");

    try {
      if (editingId) {
        const { error } = await supabase.from('overtime_records')
          .update({ start_time: startLocal, end_time: endLocal, work_description: workDescription })
          .eq('id', editingId);
        if (error) throw error;
        showToast('Registro actualizado ✅');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('overtime_records').insert([{
          name: selectedName, start_time: startLocal, end_time: endLocal, work_description: workDescription,
        }]);
        if (error) throw error;
        showToast('¡Registro guardado exitosamente!');
      }
      await fetchRecords(selectedName);
      resetForm();
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (error) {
      showToast('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setStartTime(new Date(record.start_time));
    setEndTime(new Date(record.end_time));
    setWorkDescription(record.work_description || "");
    setDescriptionLength(record.work_description?.length || 0);
    setTimeout(() => {
      formFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      startInputRef.current?.focus();
    }, 200);
  }

  async function handleDeleteRecord(id) {
    const { error } = await supabase.from('overtime_records').delete().eq('id', id);
    if (error) showToast('Error al borrar: ' + error.message);
    else { showToast('Registro eliminado correctamente 🗑️'); await fetchRecords(selectedName); }
  }

  async function handleExportAll() {
    const { data, error } = await supabase.from('overtime_records').select('*');
    if (error) { showToast('Error al exportar: ' + error.message); return; }
    if (!data?.length) { showToast('No hay datos para exportar.'); return; }

    const sorted = [...data].sort((a, b) =>
      a.name === b.name ? new Date(a.start_time) - new Date(b.start_time) : a.name.localeCompare(b.name)
    );

    const exportData = sorted.map(r => ({
      'Técnico': r.name,
      'Inicio': new Date(r.start_time),
      'Fin': new Date(r.end_time),
      'Descripción': r.work_description || 'Sin descripción',
      'Horas Trabajadas': (new Date(r.end_time) - new Date(r.start_time)) / (1000 * 60 * 60)
    }));

    const ws1 = XLSX.utils.json_to_sheet(exportData, { cellDates: true });
    const ws2 = XLSX.utils.json_to_sheet(buildAdminRows(sorted));
    ws2['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Horas Extras');
    XLSX.utils.book_append_sheet(wb, ws2, 'Formato Admin');
    XLSX.writeFile(wb, 'horas_extras.xlsx');
    showToast('Exportado a Excel 📁');
  }

  async function handleExportSingle() {
    if (!selectedName) { showToast('Selecciona un técnico primero.'); return; }

    const { data, error } = await supabase
      .from('overtime_records').select('*').eq('name', selectedName).order('start_time', { ascending: true });
    if (error) { showToast('Error al exportar: ' + error.message); return; }
    if (!data?.length) { showToast('No hay datos para exportar.'); return; }

    const ws = XLSX.utils.json_to_sheet(buildAdminRows(data));
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formato Admin');
    XLSX.writeFile(wb, `horas_extras_${selectedName.replace(/ /g, '_')}.xlsx`);
    showToast(`Exportado: ${selectedName} 📁`);
  }

  async function handleDeleteAll() {
    const { error } = await supabase.from('overtime_records').delete().neq('id', 0);
    if (error) showToast('Error al borrar: ' + error.message);
    else { showToast('¡Todos los registros han sido borrados!'); setRecords([]); setTotalHours("00:00 / 0.0"); }
  }

  function resetForm() {
    const now = new Date();
    setStartTime(new Date(now.getTime() - 2 * 60 * 60 * 1000));
    setEndTime(now);
    setWorkDescription('');
    setDescriptionLength(0);
    setEditingId(null);
  }

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    if (text.length <= 70) { setWorkDescription(text); setDescriptionLength(text.length); }
  };

  const popperModifiers = [
    { name: "preventOverflow", options: { boundary: "viewport", rootBoundary: "viewport", tether: false } },
    { name: "flip", enabled: true },
  ];

  const isSaveDisabled = !!errorStartEnd || !selectedName || !startTime || !endTime || workDescription.trim() === "" || saving;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-1 flex flex-col justify-start sm:py-2" ref={formRef}>
      <Toast message={toast} onClose={() => setToast("")} />

      {/* Modal borrar registro individual */}
      <ConfirmModal
        open={deleteRecordModal.open}
        title="¿Borrar este registro?"
        description="Esta acción no se puede deshacer. El registro será eliminado permanentemente."
        onConfirm={() => { handleDeleteRecord(deleteRecordModal.id); setDeleteRecordModal({ open: false, id: null }); }}
        onCancel={() => setDeleteRecordModal({ open: false, id: null })}
      />

      {/* Modal borrar toda la base de datos */}
      <ConfirmModal
        open={deleteAllModal}
        title="¿Borrar toda la base de datos?"
        description="Se eliminarán TODOS los registros de TODOS los técnicos. Esta acción es irreversible."
        inputLabel="Ingresa el código de seguridad para confirmar"
        inputPlaceholder="Código..."
        expectedValue="23"
        onConfirm={() => { handleDeleteAll(); setDeleteAllModal(false); }}
        onCancel={() => setDeleteAllModal(false)}
      />

      <div className="relative py-0 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-2 bg-white shadow-xl sm:rounded-3xl sm:p-6">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-4 text-base leading-6 space-y-2 text-gray-700 sm:text-lg sm:leading-7" ref={formFieldsRef}>
                <h1 className="text-3xl font-extrabold mb-2 text-center text-blue-800 bg-blue-50 py-1 rounded shadow">
                  Registro de Horas Extras
                </h1>

                {/* ✅ Banner modo edición */}
                {editingId && (
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg px-4 py-3 mb-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Modo edición activo — modifica los campos y guarda los cambios</span>
                    <button
                      className="ml-auto text-yellow-600 hover:text-yellow-800 text-xs underline"
                      onClick={resetForm}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2 mt-6">Nombre del Técnico</label>
                  <select
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    aria-label="Nombre del Técnico"
                  >
                    <option value="">Seleccione un técnico</option>
                    {technicians.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hora de Inicio <span className="ml-1 text-gray-400 cursor-pointer" title="Selecciona la hora de inicio">ⓘ</span>
                  </label>
                  <DatePicker
                    selected={startTime}
                    onChange={setStartTime}
                    showTimeSelect timeFormat="HH:mm" timeIntervals={1}
                    dateFormat="dd/MM/yyyy HH:mm"
                    className={`shadow border rounded w-full py-2 px-3 text-gray-700 ${errorStartEnd ? 'border-red-500' : ''}`}
                    maxDate={new Date()}
                    placeholderText="Selecciona la hora de inicio"
                    aria-label="Hora de Inicio"
                    customInput={<CustomInput ref={startInputRef} />}
                    popperPlacement="bottom"
                    popperModifiers={popperModifiers}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hora de Fin <span className="ml-1 text-gray-400 cursor-pointer" title="Selecciona la hora de fin">ⓘ</span>
                  </label>
                  <DatePicker
                    selected={endTime}
                    onChange={setEndTime}
                    showTimeSelect timeFormat="HH:mm" timeIntervals={1}
                    dateFormat="dd/MM/yyyy HH:mm"
                    className={`shadow border rounded w-full py-2 px-3 text-gray-700 ${errorStartEnd ? 'border-red-500' : ''}`}
                    maxDate={new Date()}
                    placeholderText="Selecciona la hora de fin"
                    aria-label="Hora de Fin"
                    customInput={<CustomInput />}
                    popperPlacement="bottom"
                    popperModifiers={popperModifiers}
                  />
                </div>

                {errorStartEnd && <p className="text-red-500 text-sm mb-4">{errorStartEnd}</p>}

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Descripción del Trabajo <span className="ml-1 text-gray-400 cursor-pointer" title="Describe brevemente el trabajo realizado">ⓘ</span>
                  </label>
                  <textarea
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={workDescription}
                    onChange={handleDescriptionChange}
                    rows="3"
                    placeholder="Ejemplo: Se hizo Limpieza de filtros en Y, 2 veces, de U1 y U2"
                    aria-label="Descripción del Trabajo"
                    maxLength="70"
                  />
                  <p className="text-gray-500 text-sm text-right">{descriptionLength}/70</p>
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    disabled={isSaveDisabled}
                    className={`bg-blue-600 text-white font-bold py-3 px-4 rounded w-full shadow transition
                      ${isSaveDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    onClick={handleSave}
                  >
                    {saving ? (
                      <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (editingId ? "Actualizar Registro" : "Guardar Registro")}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de registros */}
            {selectedName && (
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-2 text-center text-blue-800 bg-blue-50 py-2 rounded">
                  Registros de {selectedName}
                </h2>
                <p className="mb-4 text-center text-gray-700">
                  <span className="font-semibold">Total Horas Trabajadas:</span>{" "}
                  <span className="font-bold text-blue-700">{totalHours}</span>
                </p>
                {loading ? <p className="text-center">Cargando...</p> : (
                  <div className="space-y-4">
                    {records.length === 0 && <div className="text-center text-gray-500">No hay registros.</div>}
                    {records.map((record, idx) => (
                      <div
                        key={record.id}
                        ref={idx === 0 ? listRef : null}
                        className={`bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border
                          ${editingId === record.id ? 'border-yellow-400 ring-2 ring-yellow-300' : 'border-gray-200'}`}
                      >
                        <div>
                          <div className="text-gray-700"><span className="font-semibold">Inicio:</span> {formatDate(record.start_time)}</div>
                          <div className="text-gray-700"><span className="font-semibold">Fin:</span> {formatDate(record.end_time)}</div>
                          <div className="text-gray-700"><span className="font-semibold">Descripción:</span> {record.work_description || "Sin descripción"}</div>
                          <div className="text-blue-700 font-bold"><span className="font-semibold">Horas:</span> {calculateHours(record.start_time, record.end_time)}</div>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <button
                            className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-4 rounded shadow transition"
                            onClick={() => handleEdit(record)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-4 rounded shadow transition"
                            onClick={() => setDeleteRecordModal({ open: true, id: record.id })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" />
                            </svg>
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botones de exportar */}
            <div className="mt-12 flex flex-col gap-4">
              {selectedName && (
                <button
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                  onClick={handleExportSingle}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Exportar Mis Horas
                </button>
              )}
              <button
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                onClick={handleExportAll}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Exportar Excel (Todo)
              </button>

              {/* ✅ Zona de peligro separada visualmente */}
              <div className="border border-red-200 rounded-xl p-4 mt-2 bg-red-50">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3 text-center">⚠ Zona de peligro</p>
                <button
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                  onClick={() => setDeleteAllModal(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" />
                  </svg>
                  Borrar Base de Datos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}