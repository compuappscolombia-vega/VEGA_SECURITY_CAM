import React, { useState } from 'react';
import {
  Film,
  Download,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  HardDrive,
  Calendar,
  Clock,
  CheckCircle2,
  FolderArchive,
  RefreshCw,
  Sparkles,
  Play,
  FileCheck,
} from 'lucide-react';
import type { RecordingItem, StorageMetrics } from '../types/security.ts';
import {
  calculateDaysRemaining,
  isDownloadRecommended,
  isRecordingExpired,
  formatBytes,
  ONE_DAY_MS,
} from '../utils/retentionEngine.ts';

interface RecordingsManagerProps {
  recordings: RecordingItem[];
  retentionDays: number;
  onChangeRetentionDays: (days: number) => void;
  onExecutePurge: () => void;
  onToggleLock: (id: string) => void;
  onDownloadSingle: (rec: RecordingItem) => void;
  onDownloadBulkDay: (dayTimestamp: number) => void;
  storageMetrics: StorageMetrics;
}

export const RecordingsManager: React.FC<RecordingsManagerProps> = ({
  recordings,
  retentionDays,
  onChangeRetentionDays,
  onExecutePurge,
  onToggleLock,
  onDownloadSingle,
  onDownloadBulkDay,
  storageMetrics,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'TODAY' | 'YESTERDAY' | 'LOCKED'>('ALL');
  const [activePreviewRec, setActivePreviewRec] = useState<RecordingItem | null>(null);

  const now = Date.now();

  const filteredRecordings = recordings.filter((r) => {
    if (selectedFilter === 'CRITICAL') {
      return isDownloadRecommended(r.timestamp, retentionDays, now);
    }
    if (selectedFilter === 'TODAY') {
      return now - r.timestamp < ONE_DAY_MS;
    }
    if (selectedFilter === 'YESTERDAY') {
      const age = now - r.timestamp;
      return age >= ONE_DAY_MS && age < 2 * ONE_DAY_MS;
    }
    if (selectedFilter === 'LOCKED') {
      return !!r.isLocked;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 8-10 Days Auto-Purge Policy Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                <FolderArchive className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Política de Grabación 24/7 y Purga Inteligente
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El sistema mantiene la rotación continua en la nube. Cada{' '}
              <strong className="text-cyan-400 font-mono">{retentionDays} días</strong>, las grabaciones antiguas se
              eliminan permanentemente para mantener el almacenamiento optimizado y libre de sobrecostos.{' '}
              <strong className="text-amber-300 font-semibold">
                El cliente decide si descarga o no las grabaciones del día antes de que el sistema las borre.
              </strong>
            </p>
          </div>

          {/* Retention Configuration Selector */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Regla de Retención en la Nube:
            </label>
            <div className="flex items-center gap-2">
              {[8, 9, 10].map((days) => (
                <button
                  key={days}
                  onClick={() => onChangeRetentionDays(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    retentionDays === days
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {days} Días
                </button>
              ))}
            </div>
            <button
              onClick={onExecutePurge}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 rounded-lg text-xs font-semibold transition-colors"
              title="Elimina grabaciones mayores al límite y libera espacio en disco"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ejecutar Purga Ahora</span>
            </button>
          </div>
        </div>

        {/* Storage Metrics Gauge */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Espacio Usado:</span>
            <p className="text-lg font-bold text-white mt-1">
              {formatBytes(storageMetrics.usedBytes)}{' '}
              <span className="text-xs text-cyan-400">({storageMetrics.usedPercentage}%)</span>
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${storageMetrics.usedPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Espacio Libre:</span>
            <p className="text-lg font-bold text-emerald-400 mt-1">{formatBytes(storageMetrics.freeBytes)}</p>
            <span className="text-[10px] text-slate-500">De 100 GB cuota cloud</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-500/30">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Próximas a Eliminarse (&lt;24h):
            </span>
            <p className="text-lg font-bold text-amber-300 mt-1">{storageMetrics.impendingPurgeCount} archivos</p>
            <span className="text-[10px] text-slate-400">Descarga recomendada</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Grabaciones Totales:</span>
            <p className="text-lg font-bold text-white mt-1">{storageMetrics.recordingsCount} archivos</p>
            <span className="text-[10px] text-slate-400">
              {storageMetrics.expiredCount > 0
                ? `${storageMetrics.expiredCount} expiradas listas para purga`
                : 'Todas dentro del rango'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar: Bulk download & Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Filtro de Días:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('CRITICAL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedFilter === 'CRITICAL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Por Vencer (&lt;24h)
            </button>
            <button
              onClick={() => setSelectedFilter('TODAY')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedFilter === 'TODAY' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setSelectedFilter('YESTERDAY')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedFilter === 'YESTERDAY' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ayer
            </button>
            <button
              onClick={() => setSelectedFilter('LOCKED')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedFilter === 'LOCKED' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Protegidas
            </button>
          </div>
        </div>

        {/* Bulk Download Button */}
        <button
          onClick={() => onDownloadBulkDay(now)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
          title="Descargar en lote todas las grabaciones del día en archivo comprimido ZIP"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Grabaciones del Día (.ZIP)</span>
        </button>
      </div>

      {/* Recordings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Cámara</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Duración</th>
                <th className="py-3 px-4">Tamaño</th>
                <th className="py-3 px-4">Ciclo de Vida (Purga)</th>
                <th className="py-3 px-4">Estado Evidencia</th>
                <th className="py-3 px-4 text-right">Acción Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecordings.map((rec) => {
                const daysRemaining = calculateDaysRemaining(rec.timestamp, retentionDays, now);
                const isCritical = isDownloadRecommended(rec.timestamp, retentionDays, now);
                const isExpired = isRecordingExpired(rec.timestamp, retentionDays, now);

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div>
                          <span>{rec.cameraName}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {rec.eventTags?.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(rec.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono">{Math.round(rec.durationSeconds / 60)} min</td>

                    <td className="py-3 px-4 font-mono">{formatBytes(rec.fileSizeBytes)}</td>

                    {/* Purge countdown indicator */}
                    <td className="py-3 px-4">
                      {rec.isLocked ? (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-cyan-400" />
                          PROTEGIDA DE PURGA
                        </span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-bold text-red-300 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          EXPIRADA (&gt; {retentionDays} días)
                        </span>
                      ) : isCritical ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          BORRADO EN {Math.round(daysRemaining * 24)}H
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {daysRemaining.toFixed(1)} días restantes
                        </span>
                      )}
                    </td>

                    {/* Locked / Unlocked */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleLock(rec.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          rec.isLocked
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={
                          rec.isLocked
                            ? 'Evidencia protegida: no se borrará con la purga'
                            : 'Haga clic para proteger esta grabación de la purga'
                        }
                      >
                        {rec.isLocked ? <Lock className="w-3 h-3 text-cyan-400" /> : <Unlock className="w-3 h-3" />}
                        <span>{rec.isLocked ? 'Bloqueada' : 'Normal'}</span>
                      </button>
                    </td>

                    {/* Download Client Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rec.hasBeenDownloaded && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono" title="Descargado previamente">
                            <FileCheck className="w-3 h-3" />
                          </span>
                        )}

                        <button
                          onClick={() => onDownloadSingle(rec)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                            isCritical && !rec.hasBeenDownloaded
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 animate-pulse'
                              : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400'
                          }`}
                          title="Descargar archivo de video antes de su eliminación permanente"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
