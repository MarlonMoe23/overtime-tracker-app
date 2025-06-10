import React, { useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { supabase } from '../lib/supabase';
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

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

const technicians = [
  "Carlos Cisneros",
  "Juan Carrión",
  "César Sánchez",
  "Miguel Lozada",
  "Roberto Córdova",
  "Alex Haro",
  "Dario Ojeda",
  "Israel Pérez",
  "José Urquizo",
  "Kevin Vargas",
  "Edisson Bejarano",
  "Leonardo Ballesteros",
  "Marlon Ortiz",
];

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return format(d, "dd/MM/yyyy HH:mm");
}

function calculateHours(start, end) {
  if (!start || !end) return "00:00";
  const diffMs = new Date(end) - new Date(start);
  if (diffMs < 0) return "00:00";
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Input personalizado para DatePicker que acepta ref
const CustomInput = forwardRef(function CustomInput(props, ref) {
  const { value, onClick, onChange, onFocus, placeholder, ariaLabel } = props;
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
      readOnly // para evitar edición manual y usar solo picker
    />
  );
});
CustomInput.displayName = "CustomInput";

export default function OvertimeForm() {
  const [selectedName, setSelectedName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [workDescription, setWorkDescription] = useState("");
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState("");
  const [totalHours, setTotalHours] = useState("00:00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorStartEnd, setErrorStartEnd] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isClient, setIsClient] = useState(false);

  const listRef = useRef(null);
  const startInputRef = useRef(null);
  const formRef = useRef(null); // Ref para el formulario completo
  const formFieldsRef = useRef(null); // Ref para los campos del formulario

  useEffect(() => {
    const now = new Date();
    const twoHoursBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    setStartTime(twoHoursBefore);
    setEndTime(now);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const storedName = localStorage.getItem("lastTechnician") || "";
      setSelectedName(storedName);
    }
  }, [isClient]);

  const showToast = useCallback((msg) => {
    setToast(msg);
  }, []);

  const fetchRecords = useCallback(async (name) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('overtime_records')
      .select('*')
      .eq('name', name)
      .order('start_time', { ascending: false });
    if (error) {
      showToast("Error al cargar registros");
      setRecords([]);
    } else {
      setRecords(data);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (selectedName) {
      localStorage.setItem("lastTechnician", selectedName);
      fetchRecords(selectedName);
    } else {
      setRecords([]);
      setTotalHours("00:00");
    }
  }, [selectedName, fetchRecords]);

  useEffect(() => {
    if (records.length > 0) {
      let totalMinutes = 0;
      records.forEach(r => {
        const diff = new Date(r.end_time) - new Date(r.start_time);
        if (diff > 0) totalMinutes += Math.floor(diff / (1000 * 60));
      });
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setTotalHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    } else {
      setTotalHours("00:00");
    }
  }, [records]);

  useEffect(() => {
    if (startTime && endTime && startTime >= endTime) {
      setErrorStartEnd("La hora de inicio debe ser antes que la de fin.");
    } else {
      setErrorStartEnd("");
    }
  }, [startTime, endTime]);

  async function handleSave() {
    if (!selectedName || !startTime || !endTime || workDescription.trim() === "") {
      showToast('⚠️ Completa todos los campos obligatorios.');
      return;
    }
    if (startTime >= endTime) {
      showToast('⚠️ La hora de inicio debe ser antes que la de fin.');
      return;
    }

    setSaving(true);

    const startLocal = format(startTime, "yyyy-MM-dd'T'HH:mm:ss");
    const endLocal = format(endTime, "yyyy-MM-dd'T'HH:mm:ss");

    try {
      if (editingId) {
        const { error } = await supabase
          .from('overtime_records')
          .update({
            start_time: startLocal,
            end_time: endLocal,
            work_description: workDescription,
          })
          .eq('id', editingId);
        if (error) throw error;
        showToast('Registro actualizado ✅');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('overtime_records').insert([
          {
            name: selectedName,
            start_time: startLocal,
            end_time: endLocal,
            work_description: workDescription,
          },
        ]);
        if (error) throw error;
        showToast('¡Registro guardado exitosamente!');
      }
      await fetchRecords(selectedName);
      resetForm();
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 200);
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
    setDescriptionLength(record.work_description ? record.work_description.length : 0);

    // Scroll suave al formulario y focus en input inicio
    setTimeout(() => {
      if (formFieldsRef.current) {
        formFieldsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (startInputRef.current) {
        startInputRef.current.focus();
      }
    }, 200);
  }

  async function handleDeleteRecord(id) {
    if (window.confirm("¿Está seguro de borrar este registro? Esta acción no se puede deshacer.")) {
      const { error } = await supabase
        .from('overtime_records')
        .delete()
        .eq('id', id);
      
      if (error) {
        showToast('Error al borrar: ' + error.message);
      } else {
        showToast('Registro eliminado correctamente 🗑️');
        await fetchRecords(selectedName);
      }
    }
  }

  async function handleExportAll() {
    const { data, error } = await supabase.from('overtime_records').select('*');
    if (error) {
      showToast('Error al exportar: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      showToast('No hay datos para exportar.');
      return;
    }
    
    const sorted = [...data].sort((a, b) =>
      a.name === b.name
        ? new Date(a.start_time) - new Date(b.start_time)
        : a.name.localeCompare(b.name)
    );

    const exportData = sorted.map(r => {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      const diff = (end - start) / (1000 * 60 * 60);

      return {
        'Técnico': r.name,
        'Inicio': start,
        'Fin': end,
        'Descripción': r.work_description || 'Sin descripción',
        'Horas Trabajadas': diff
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData, { cellDates: true });

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = ws[XLSX.utils.encode_cell({ c: C, r: 0 })].v;
      for (let R = 1; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[addr];
        if (!cell) continue;

        if (header === 'Inicio' || header === 'Fin') {
          cell.z = 'dd/mm/yyyy hh:mm';
        }
        if (header === 'Horas Trabajadas') {
          cell.z = '0.00';
        }
      }
    }

    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas Extras');
    XLSX.writeFile(wb, 'horas_extras.xlsx');
    showToast('Exportado a Excel 📁');
  }

  async function handleDeleteAll() {
    const code = prompt("Para borrar todos los datos, ingresa el código:");
    if (code !== "23") {
      showToast("Código incorrecto. No se borró nada.");
      return;
    }
    const { error } = await supabase.from('overtime_records').delete().neq('id', 0);
    if (error) {
      showToast('Error al borrar: ' + error.message);
    } else {
      showToast('¡Todos los registros han sido borrados!');
      setRecords([]);
      setTotalHours("00:00");
    }
  }

  function resetForm() {
    const now = new Date();
    const twoHoursBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    setStartTime(twoHoursBefore);
    setEndTime(now);
    setWorkDescription('');
    setDescriptionLength(0);
    setEditingId(null);
  }

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    if (text.length <= 100) {
      setWorkDescription(text);
      setDescriptionLength(text.length);
    }
  };

  return (
   <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-1 flex flex-col justify-start sm:py-2" ref={formRef}>
  <Toast message={toast} onClose={() => setToast("")} />
  <div className="relative py-0 sm:max-w-xl sm:mx-auto">
    <div className="relative px-4 py-2 bg-white shadow-xl sm:rounded-3xl sm:p-6">
      <div className="max-w-md mx-auto">
        <div className="divide-y divide-gray-200">
          <div className="py-4 text-base leading-6 space-y-2 text-gray-700 sm:text-lg sm:leading-7" ref={formFieldsRef}>
            <h1 className="text-3xl font-extrabold mb-2 text-center text-blue-800 bg-blue-50 py-1 rounded shadow">
              Registro de Horas Extras
            </h1>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2 mt-6">
                    Nombre del Técnico
                  </label>
                  <select
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    aria-label="Nombre del Técnico"
                  >
                    <option value="">Seleccione un técnico</option>
                    {technicians.map((tech) => (
                      <option key={tech} value={tech}>
                        {tech}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hora de Inicio
                    <span className="ml-1 text-gray-400 cursor-pointer" title="Selecciona la hora de inicio">
                      ⓘ
                    </span>
                  </label>
                 <DatePicker
  selected={startTime}
  onChange={(date) => setStartTime(date)}
  showTimeSelect
  timeFormat="HH:mm"
  timeIntervals={5}
  dateFormat="dd/MM/yyyy HH:mm"
  className={`shadow border rounded w-full py-2 px-3 text-gray-700 ${errorStartEnd ? 'border-red-500' : ''}`}
  maxDate={new Date()}
  placeholderText="Selecciona la hora de inicio"
  aria-label="Hora de Inicio"
  customInput={<CustomInput ref={startInputRef} />}
  popperPlacement="bottom"
  popperModifiers={[
    {
      name: "preventOverflow",
      options: {
        boundary: "viewport",
        rootBoundary: "viewport",
        tether: false,
      },
    },
    {
      name: "flip",
      enabled: true,
    },
  ]}
/>







                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hora de Fin
                    <span className="ml-1 text-gray-400 cursor-pointer" title="Selecciona la hora de fin">
                      ⓘ
                    </span>
                  </label>
                  


<DatePicker
                    selected={endTime}
                    onChange={(date) => setEndTime(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={5}
                    dateFormat="dd/MM/yyyy HH:mm"
                    className={`shadow border rounded w-full py-2 px-3 text-gray-700 ${errorStartEnd ? 'border-red-500' : ''}`}
                    maxDate={new Date()}
                    placeholderText="Selecciona la hora de fin"
                    aria-label="Hora de Fin"
                    customInput={<CustomInput />}
                  
popperPlacement="bottom"
    popperModifiers={[
      {
        name: "preventOverflow",
        options: {
          boundary: "viewport",
          rootBoundary: "viewport",
          tether: false,
        },
      },
      {
        name: "flip",
        enabled: true,
      },
    ]}



/>
                


</div>

                {errorStartEnd && <p className="text-red-500 text-sm mb-4">{errorStartEnd}</p>}

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Descripción del Trabajo
                    <span className="ml-1 text-gray-400 cursor-pointer" title="Describe brevemente el trabajo realizado">
                      ⓘ
                    </span>
                  </label>
                  <textarea
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={workDescription}
                    onChange={handleDescriptionChange}
                    rows="3"
                    placeholder="Ejemplo: CMS Limpieza de filtros en Y, 2 veces, de unidades 1 y 2"
                    aria-label="Descripción del Trabajo"
                    maxLength="100"
                    required
                  />
                  <p className="text-gray-500 text-sm text-right">{descriptionLength}/100</p>
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    disabled={!!errorStartEnd || !selectedName || !startTime || !endTime || workDescription.trim() === "" || saving}
                    className={`bg-blue-600 text-white font-bold py-3 px-4 rounded w-full shadow transition 
                      ${!!errorStartEnd || !selectedName || !startTime || !endTime || workDescription.trim() === "" || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    onClick={handleSave}
                    aria-disabled={!!errorStartEnd || !selectedName || !startTime || !endTime || workDescription.trim() === "" || saving}
                  >
                    {saving ? (
                      <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    ) : (
                      editingId ? "Actualizar Registro" : "Guardar Registro"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {selectedName && (
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-2 text-center text-blue-800 bg-blue-50 py-2 rounded">Registros de {selectedName}</h2>
                <p className="mb-4 text-center text-gray-700">
                  <span className="font-semibold">Total Horas Trabajadas:</span> <span className="font-bold text-blue-700">{totalHours}</span>
                </p>
                {loading ? (
                  <p className="text-center">Cargando...</p>
                ) : (
                  <div className="space-y-4">
                    {records.length === 0 && (
                      <div className="text-center text-gray-500">No hay registros.</div>
                    )}
                    {records.map((record, idx) => (
                      <div
                        key={record.id}
                        ref={idx === 0 ? listRef : null}
                        className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-200"
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
                            aria-label={`Editar registro iniciado el ${formatDate(record.start_time)}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                            Editar
                          </button>
                          <button
                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-4 rounded shadow transition"
                            onClick={() => handleDeleteRecord(record.id)}
                            aria-label={`Borrar registro iniciado el ${formatDate(record.start_time)}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" /></svg>
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-12 flex flex-col gap-4">
              <button
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                onClick={handleExportAll}
                aria-label="Exportar todos los registros a Excel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                Exportar Excel
              </button>
              <button
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                onClick={handleDeleteAll}
                aria-label="Borrar toda la base de datos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" /></svg>
                Borrar Base de Datos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}