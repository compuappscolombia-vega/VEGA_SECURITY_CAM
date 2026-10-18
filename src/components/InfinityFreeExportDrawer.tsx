import React, { useState } from 'react';
import {
  Download,
  FileCode,
  Copy,
  Check,
  Server,
  Database,
  FolderTree,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import JSZip from 'jszip';
import { INFINITYFREE_FILES } from '../utils/infinityFreeFiles.ts';

export const InfinityFreeExportDrawer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const currentFile = INFINITYFREE_FILES[selectedFileIndex] || INFINITYFREE_FILES[0];

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file to zip
      INFINITYFREE_FILES.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Also create grabaciones/ folder inside zip
      zip.folder('grabaciones');

      // Generate zip
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'VEGA_SECURITY_CAM_INFINITYFREE.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Card for InfinityFree */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                <Server className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Paquete Completo para InfinityFree (PHP + JavaScript + MySQL)
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Todos los módulos de VEGA SECURITY CAM (transmisión en vivo de baja latencia, reconocimiento facial
              biométrico, purga de 8-10 días, 2FA y escaneo de puertos de fabricantes) compilados en código PHP y
              JavaScript puro, listos para subir a la carpeta <strong className="text-cyan-400 font-mono">htdocs/</strong>{' '}
              de su cuenta de InfinityFree.
            </p>
          </div>

          {/* 1-Click ZIP Download Button */}
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Download className={`w-5 h-5 ${isZipping ? 'animate-bounce' : ''}`} />
            <span>{isZipping ? 'Generando ZIP...' : 'Descargar Todo en ZIP (.ZIP)'}</span>
          </button>
        </div>

        {/* Technical InfinityFree highlights */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Supera Límites de InfinityFree</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Streaming WebRTC directo en navegador: no satura la CPU de 30 segundos de PHP.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <Database className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">MySQL PDO con Prepared Statements</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cifrado biométrico AES-256 e integridad SHA-256 en tablas optimizadas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Purga 8-10 Días Auto-Trigger</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Purga automática ejecutada por cron o al abrir el panel para no depender de crontab root.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Inspector & File Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <span>Archivos del Paquete</span>
          </div>

          <div className="space-y-1">
            {INFINITYFREE_FILES.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => {
                  setSelectedFileIndex(idx);
                  setCopied(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                  selectedFileIndex === idx
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="truncate">{file.name}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-bold ${
                    selectedFileIndex === idx ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-950 text-slate-500'
                  }`}
                >
                  {file.language}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Code View Screen */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Header of code viewer */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold text-white text-xs">{currentFile.path}</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">— {currentFile.description}</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
          </div>

          {/* Syntax Code Container */}
          <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed selection:bg-cyan-500 selection:text-slate-950">
            <code>{currentFile.content}</code>
          </pre>
        </div>
      </div>

      {/* InfinityFree Step-by-Step Installation Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white text-base">Instrucciones de Instalación en InfinityFree (Paso a Paso)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-500/40">
              1
            </div>
            <h4 className="font-bold text-white">Crear Base MySQL</h4>
            <p className="text-slate-400">
              En el cPanel de InfinityFree vaya a "MySQL Databases" y cree la base de datos. Abra phpMyAdmin e importe el archivo <code className="text-cyan-400 font-mono">schema.sql</code>.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-500/40">
              2
            </div>
            <h4 className="font-bold text-white">Configurar conexion.php</h4>
            <p className="text-slate-400">
              Edite <code className="text-cyan-400 font-mono">conexion.php</code> con el host (ej. sqlXXX.infinityfree.com), usuario epiz_XXXXX y contraseña provistos por InfinityFree.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-500/40">
              3
            </div>
            <h4 className="font-bold text-white">Subir a htdocs/</h4>
            <p className="text-slate-400">
              Extraiga el archivo ZIP y suba los archivos a la carpeta <code className="text-cyan-400 font-mono">htdocs/</code> mediante el Online File Manager o FileZilla FTP. Cree la carpeta <code className="text-cyan-400 font-mono">grabaciones/</code> con permisos 755.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-500/40">
              4
            </div>
            <h4 className="font-bold text-white">Iniciar Sesión con 2FA</h4>
            <p className="text-slate-400">
              Abra su subdominio en el navegador. Ingrese con usuario <code className="text-cyan-400 font-mono">admin</code>, clave <code className="text-cyan-400 font-mono">admin123</code> y PIN 2FA <code className="text-cyan-400 font-mono">123456</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
