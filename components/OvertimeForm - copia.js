import React, { useState, useEffect, useRef } from "react";
import { supabase } from '../lib/supabase';
import * as XLSX from "xlsx";

// Toast component
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

// Formatea para input datetime-local (hora local)
function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Formatea para mostrar (hora local)
function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function calculateHours(start, end) {
  if (!start || !end) return "00:00";
  const diffMs = new Date(end) - new Date(start);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function OvertimeForm() {
  const [selectedName, setSelectedName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState("");
  const [totalHours, setTotalHours] = useState("00:00");
  const [loading, setLoading] = useState(false);

  // Ref para scroll automático al registro y al input de inicio
  const listRef = useRef(null);
  const startInputRef = useRef(null);

  // Inicializa fechas
  useEffect(() => {
    const now = new Date(); // Hora local
    const startTimeLocal = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 horas antes
    setStartTime(formatDateTimeLocal(startTimeLocal));
    setEndTime(formatDateTimeLocal(now));
  }, []);

  // Carga registros cuando se selecciona un técnico
  useEffect(() => {
    if (selectedName) {
      fetchRecords(selectedName);
    } else {
      setRecords([]);
      setTotalHours("00:00");
    }
  }, [selectedName]);

  // Calcula total de horas
  useEffect(() => {
    if (records.length > 0) {
      let totalMinutes = 0;
      records.forEach(r => {
        const diff = new Date(r.end_time) - new Date(r.start_time);
        totalMinutes += Math.floor(diff / (1000 * 60));
      });
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setTotalHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    } else {
      setTotalHours("00:00");
    }
  }, [records]);

  // Toast helpers
  const showToast = (msg) => {
    setToast(msg);
  };

  // Fetch records from Supabase
  async function fetchRecords(name) {
    setLoading(true);
    const { data, error } = await supabase
      .from('overtime_records')
      .select('*')
      .eq('name', name)
      .order('start_time', { ascending: false }); // Más reciente primero
    if (error) {
      showToast("Error al cargar registros");
      setRecords([]);
    } else {
      setRecords(data);
    }
    setLoading(false);
  }

  // Guardar o actualizar registro
  async function handleSave() {
    if (!selectedName || !startTime || !endTime) {
      showToast('⚠️ Completa todos los campos obligatorios.');
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      showToast('⚠️ La hora de inicio debe ser antes que la de fin.');
      setEndTime(""); // Opcional: limpia el campo de fin
      return;
    }

    if (editingId) {
      // Actualizar registro
      const { error } = await supabase
        .from('overtime_records')
        .update({
          start_time: startTime, // GUARDAR EL STRING
          end_time: endTime,     // GUARDAR EL STRING
          work_description: workDescription,
        })
        .eq('id', editingId);
      if (error) {
        showToast('Error al actualizar: ' + error.message);
      } else {
        showToast('Registro actualizado ✅');
        setEditingId(null);
        await fetchRecords(selectedName);
        resetForm();
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 200);
      }
    } else {
      // Nuevo registro
      const { error } = await supabase.from('overtime_records').insert([
        {
          name: selectedName,
          start_time: startTime, // GUARDAR EL STRING
          end_time: endTime,     // GUARDAR EL STRING
          work_description: workDescription,
        },
      ]);
      if (error) {
        showToast('Error al guardar: ' + error.message);
      } else {
        showToast('¡Registro guardado exitosamente!');
        await fetchRecords(selectedName);
        resetForm();
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 200);
      }
    }
  }

  // Editar registro
  function handleEdit(record) {
    setEditingId(record.id);
    setStartTime(record.start_time); // USAR EL STRING GUARDADO
    setEndTime(record.end_time);     // USAR EL STRING GUARDADO
    setWorkDescription(record.work_description || "");
    setTimeout(() => {
      if (startInputRef.current) {
        startInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        startInputRef.current.focus();
      }
    }, 200);
  }

  // Exportar a Excel (toda la base de datos, ordenada por nombre y fecha de inicio)
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
    
    // Ordenar por nombre y luego por fecha de inicio (ascendente)
    const sorted = [...data].sort((a, b) =>
      a.name === b.name
        ? new Date(a.start_time) - new Date(b.start_time)
        : a.name.localeCompare(b.name)
    );

    // Construir los objetos usando Date y número
    const exportData = sorted.map(r => {
      const start = new Date(r.start_time);        // objeto Date
      const end = new Date(r.end_time);            // objeto Date
      const diff = (end - start) / (1000 * 60 * 60); // horas decimales

      return {
        'Técnico': r.name,
        'Inicio': start,                // Date
        'Fin': end,                     // Date
        'Descripción': r.work_description || 'Sin descripción',
        'Horas Trabajadas': diff        // número
      };
    });

    // Crear la hoja (cellDates:true hará que Inicio y Fin sean tipo 'd')
    const ws = XLSX.utils.json_to_sheet(exportData, { cellDates: true });

    // Aplicar formatos de número (opcional pero recomendable)
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = ws[XLSX.utils.encode_cell({ c: C, r: 0 })].v;
      for (let R = 1; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[addr];
        if (!cell) continue;

        if (header === 'Inicio' || header === 'Fin') {
          cell.z = 'dd/mm/yyyy hh:mm';   // formato fecha-hora
        }
        if (header === 'Horas Trabajadas') {
          cell.z = '0.00';               // dos decimales (ej. 4.25 h)
        }
      }
    }

    ws['!cols'] = [
      { wch: 25 },  // Técnico
      { wch: 20 },  // Inicio
      { wch: 20 },  // Fin
      { wch: 40 },  // Descripción
      { wch: 15 }   // Horas Trabajadas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas Extras');
    XLSX.writeFile(wb, 'horas_extras.xlsx');
    showToast('Exportado a Excel 📁');
  }

  // Borrar todos los datos (requiere código)
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

  // Reset form
  function resetForm() {
    const now = new Date();
    const startTimeLocal = new Date(now.getTime() - (2 * 60 * 60 * 1000));
    setStartTime(formatDateTimeLocal(startTimeLocal));
    setEndTime(formatDateTimeLocal(now));
    setWorkDescription('');
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-xl sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-extrabold mb-8 text-center text-blue-800 bg-blue-50 py-2 rounded shadow">
                  Registro de Horas Extras
                </h1>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Nombre del Técnico
                  </label>
                  <select
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
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
                  </label>
                  <input
                    ref={startInputRef}
                    type="datetime-local"
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hora de Fin
                  </label>
                  <input
                    type="datetime-local"
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Descripción del Trabajo
                  </label>
                  <textarea
                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    rows="3"
                  />
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                    onClick={handleSave}
                  >
                    {editingId ? "Actualizar Registro" : "Guardar Registro"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mostrar registros solo si hay técnico seleccionado */}
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
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                            Editar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botones de administración al final */}
            <div className="mt-12 flex flex-col gap-4">
              <button
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                onClick={handleExportAll}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round"  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                Exportar Excel
              </button>
              <button
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded w-full shadow transition"
                onClick={handleDeleteAll}
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