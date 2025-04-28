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
  "Roberto Córdova",
  "Carlos Cisneros",
  "Miguel Lozada",
  "César Sánchez",
  "N1",
  "Alex Haro",
  "Dario Ojeda",
  "José Urquizo",
  "Kevin Vargas",
  "N2",
];

function formatDateTime(date) {
  return date.toISOString().slice(0, 16);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  // Hora de Ecuador (UTC-5)
  const ecuadorTime = new Date(d.getTime() - (5 * 60 * 60 * 1000));
  return `${ecuadorTime.getDate().toString().padStart(2, '0')}/${(ecuadorTime.getMonth() + 1).toString().padStart(2, '0')}/${ecuadorTime.getFullYear()} ${ecuadorTime.getHours().toString().padStart(2, '0')}:${ecuadorTime.getMinutes().toString().padStart(2, '0')}`;
}

function calculateHours(start, end) {
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

  // Ref para scroll automático
  const listRef = useRef(null);

  // Inicializa fechas
  useEffect(() => {
    const now = new Date();
    const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const startTimeEcuador = new Date(now.getTime() - (7 * 60 * 60 * 1000));
    setStartTime(formatDateTime(startTimeEcuador));
    setEndTime(formatDateTime(ecuadorTime));
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
          start_time: new Date(startTime),
          end_time: new Date(endTime),
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
        // Scroll al registro editado (el más reciente)
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
          start_time: new Date(startTime),
          end_time: new Date(endTime),
          work_description: workDescription,
        },
      ]);
      if (error) {
        showToast('Error al guardar: ' + error.message);
      } else {
        showToast('¡Registro guardado exitosamente!');
        await fetchRecords(selectedName);
        resetForm();
        // Scroll al registro recién ingresado (el más reciente)
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
    setStartTime(formatDateTime(new Date(record.start_time)));
    setEndTime(formatDateTime(new Date(record.end_time)));
    setWorkDescription(record.work_description || "");
  }

  // Exportar a Excel (toda la base de datos)
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
    const exportData = data.map((entry) => ({
      'Técnico': entry.name,
      'Inicio': formatDate(entry.start_time),
      'Fin': formatDate(entry.end_time),
      'Descripción': entry.work_description || 'Sin descripción',
      'Horas Trabajadas': calculateHours(entry.start_time, entry.end_time),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData, { cellDates: true });
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Horas Extras');
    XLSX.writeFile(workbook, 'horas_extras.xlsx');
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
    const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const startTimeEcuador = new Date(now.getTime() - (7 * 60 * 60 * 1000));
    setStartTime(formatDateTime(startTimeEcuador));
    setEndTime(formatDateTime(ecuadorTime));
    setWorkDescription('');
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8 text-center">
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
                    Descripción del Trabajo (Opcional)
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
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                    onClick={handleSave}
                  >
                    {editingId ? "Actualizar Registro" : "Guardar Registro"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mostrar registros solo si hay técnico seleccionado */}
            {selectedName && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-2 text-center text-gray-800">Registros de {selectedName}</h2>
                <p className="mb-2 text-center text-gray-700">
                  Total Horas Trabajadas: <span className="font-bold">{totalHours}</span>
                </p>
                {loading ? (
                  <p className="text-center">Cargando...</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {records.length === 0 && (
                      <li className="py-2 text-center text-gray-500">No hay registros.</li>
                    )}
                    {records.map((record, idx) => (
                      <li
                        key={record.id}
                        ref={idx === 0 ? listRef : null} // El más reciente primero
                        className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <span className="block text-gray-800"><strong>Inicio:</strong> {formatDate(record.start_time)}</span>
                          <span className="block text-gray-800"><strong>Fin:</strong> {formatDate(record.end_time)}</span>
                          <span className="block text-gray-800"><strong>Descripción:</strong> {record.work_description || "Sin descripción"}</span>
                          <span className="block text-gray-800"><strong>Horas:</strong> {calculateHours(record.start_time, record.end_time)}</span>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded"
                            onClick={() => handleEdit(record)}
                          >
                            Editar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Botones de administración al final */}
            <div className="mt-12 flex flex-col gap-4">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                onClick={handleExportAll}
              >
                Exportar toda la base de datos a Excel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
                onClick={handleDeleteAll}
              >
                Borrar TODOS los datos (admin)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}