import React from "react";
import { supabase } from '../lib/supabase';
import * as XLSX from "xlsx";

function OvertimeForm() {
  const [selectedName, setSelectedName] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [workDescription, setWorkDescription] = React.useState("");

  const technicians = [
    "Alex Haro",
    "Carlos Cisneros",
    "César Sánchez",
    "Dario Ojeda",
    "José Urquizo",
    "Kevin Vargas",
    "Marlon Ortiz",
    "Roberto Córdova",
    "N1",
    "N2",
    "N3",
    "N4",
  ];

  React.useEffect(() => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    setStartTime(formatDateTime(twoHoursAgo));
    setEndTime(formatDateTime(now));
  }, []);

  const formatDateTime = (date) => {
    return date.toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!selectedName || !startTime || !endTime) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const { error } = await supabase.from('overtime_records').insert([
      {
        name: selectedName,
        start_time: new Date(startTime),
        end_time: new Date(endTime),
        work_description: workDescription,
      },
    ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('¡Registro guardado exitosamente!');
      setSelectedName('');
      setWorkDescription('');
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      setStartTime(formatDateTime(twoHoursAgo));
      setEndTime(formatDateTime(now));
    }
  };

  const handleExport = async () => {
    const { data, error } = await supabase.from('overtime_records').select('*');
    if (error) {
      alert('Error al exportar: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const rows = data.map(row => ({
      NOMBRE: row.name,
      INICIO: new Date(row.start_time).toLocaleString(),
      FIN: new Date(row.end_time).toLocaleString(),
      TRABAJO: row.work_description || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HorasExtras");
    XLSX.writeFile(workbook, "horas_extras.xlsx");
  };

  const handleDeleteAll = async () => {
    const code = prompt("Para borrar todos los datos, ingresa el código 23:");
    if (code !== "23") {
      alert("Código incorrecto. No se borró nada.");
      return;
    }
    const { error } = await supabase.from('overtime_records').delete().neq('id', 0);
    if (error) {
      alert('Error al borrar: ' + error.message);
    } else {
      alert('¡Todos los registros han sido borrados!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
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
                    Guardar Registro
                  </button>

                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                    onClick={handleExport}
                  >
                    Exportar a Excel
                  </button>

                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
                    onClick={handleDeleteAll}
                  >
                    Borrar Todos los Datos
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OvertimeForm;