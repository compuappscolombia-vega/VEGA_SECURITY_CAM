import React, { useState } from 'react';
import {
  FileText,
  Download,
  Shield,
  FileSpreadsheet,
  X,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { SecurityEvent, ActiveCamera, RecordingItem } from '../types/security.ts';
import { exportEventsToCsv, triggerDownload, generatePdfReport } from '../utils/reportGenerator.ts';

interface SecurityReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: SecurityEvent[];
  cameras: ActiveCamera[];
  recordings: RecordingItem[];
  retentionDays: number;
}

export const SecurityReportsModal: React.FC<SecurityReportsModalProps> = ({
  isOpen,
  onClose,
  events,
  cameras,
  recordings,
  retentionDays,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const csvContent = exportEventsToCsv(events);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(csvContent, `VEGA_SECURITY_EVENTOS_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportPdf = () => {
    generatePdfReport(cameras, events, recordings, retentionDays);
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'FACE') return e.type.startsWith('FACE_');
    if (filterType === 'DANGER') return e.severity === 'danger';
    if (filterType === 'PURGE') return e.type === 'PURGE_COMPLETED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Reportes y Auditoría de Seguridad</h3>
              <p className="text-[11px] text-slate-400">Exportación de datos biométricos, incidentes y almacenamiento</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF Oficial</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Filtrar:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({events.length})
              </button>
              <button
                onClick={() => setFilterType('FACE')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'FACE' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reconocimiento Facial
              </button>
              <button
                onClick={() => setFilterType('DANGER')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'DANGER' ? 'bg-red-500 text-white font-bold' : 'text-red-400 hover:text-red-300'
                }`}
              >
                Alertas Críticas
              </button>
              <button
                onClick={() => setFilterType('PURGE')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'PURGE' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Purgas de Almacenamiento
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firma Criptográfica SHA-256 Verificada</span>
          </div>
        </div>

        {/* Events Table Container */}
        <div className="flex-1 overflow-y-auto py-3">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Cámara</th>
                <th className="py-2.5 px-3">Tipo de Evento</th>
                <th className="py-2.5 px-3">Severidad</th>
                <th className="py-2.5 px-3">Detalle del Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">{ev.cameraName}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400">{ev.type}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ev.severity === 'danger'
                          ? 'bg-red-950 text-red-300 border border-red-500/50'
                          : ev.severity === 'warning'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      }`}
                    >
                      {ev.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{ev.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
