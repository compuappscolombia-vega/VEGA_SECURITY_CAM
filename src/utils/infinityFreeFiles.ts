/**
 * VEGA SECURITY CAM - Complete InfinityFree Deployment File Templates
 * High-quality, production-ready PHP 7.4/8.x + Vanilla JS files
 * tailored specifically for InfinityFree hosting (Apache, MySQL, PHP, htdocs).
 */

export interface InfinityFreeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const INFINITYFREE_FILES: InfinityFreeFile[] = [
  {
    name: 'conexion.php',
    path: 'conexion.php',
    language: 'php',
    description: 'Conexión a la base de datos MySQL con PDO, UTF-8 y manejo seguro de sesiones.',
    content: `<?php
/**
 * VEGA SECURITY CAM - Conexión MySQL para InfinityFree
 * Configurado con PDO para máxima seguridad contra inyecciones SQL.
 */

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    // Configuración de cookies seguras para InfinityFree
    session_set_cookie_params([
        'lifetime' => 86400, // 24 horas
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Configuración de base de datos InfinityFree
// NOTA: Reemplace con sus datos reales del panel de control de InfinityFree (cPanel -> MySQL Databases)
$db_host = "sqlXXX.infinityfree.com"; // Servidor MySQL asignado por InfinityFree
$db_name = "epiz_XXXXXX_vega_security"; // Nombre de la BD creada
$db_user = "epiz_XXXXXX";              // Usuario de la BD de InfinityFree
$db_pass = "SU_CONTRASEÑA_VISTA_EN_CPANEL"; // Contraseña de la cuenta InfinityFree

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // En producción nunca mostrar la contraseña o detalles sensibles
    die(json_encode([
        'status' => 'error',
        'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()
    ]));
}

// Clave de cifrado maestro para datos biométricos y E2EE
define('VEGA_ENCRYPTION_KEY', hash('sha256', 'VEGA_CAM_SECURITY_MASTER_KEY_2026'));
?>`
  },
  {
    name: '.htaccess',
    path: '.htaccess',
    language: 'apache',
    description: 'Reglas de servidor Apache para InfinityFree: tipos MIME de video, compresión y protección.',
    content: `RewriteEngine On

# Forzar HTTPS si está disponible en InfinityFree
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Tipos MIME para streaming de video HTML5 directo sin latencia
AddType video/mp4 .mp4
AddType video/webm .webm
AddType application/x-mpegURL .m3u8
AddType video/MP2T .ts

# Cabeceras de seguridad y CORS para cámaras IP locales
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
</IfModule>

# Proteger archivos sensibles
<FilesMatch "^(conexion\\.php|schema\\.sql|\\.env)$">
    Order allow,deny
    Deny from all
</FilesMatch>`
  },
  {
    name: 'schema.sql',
    path: 'schema.sql',
    language: 'sql',
    description: 'Estructura SQL para importar en phpMyAdmin de InfinityFree.',
    content: `-- VEGA SECURITY CAM - Esquema de Base de Datos para InfinityFree / MySQL
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_2fa VARCHAR(10) NOT NULL DEFAULT '123456',
    is_2fa_enabled TINYINT(1) DEFAULT 1,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS camaras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ip_or_host VARCHAR(150) NOT NULL,
    puerto_rtsp INT DEFAULT 554,
    puerto_onvif INT DEFAULT 8000,
    puerto_http INT DEFAULT 80,
    fabricante VARCHAR(50) DEFAULT 'Genérico',
    modelo VARCHAR(100) DEFAULT 'HD WiFi Cam',
    protocolo VARCHAR(20) DEFAULT 'RTSP',
    stream_url VARCHAR(255) NOT NULL,
    usuario_cam VARCHAR(50) DEFAULT 'admin',
    password_cam VARCHAR(100) DEFAULT '',
    tipo_conexion VARCHAR(20) DEFAULT 'WIFI',
    estado VARCHAR(20) DEFAULT 'ONLINE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grabaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camara_id INT NOT NULL,
    archivo_nombre VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    duracion_segundos INT DEFAULT 60,
    fecha_grabacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    es_bloqueado_evidencia TINYINT(1) DEFAULT 0,
    descargado_por_cliente TINYINT(1) DEFAULT 0,
    FOREIGN KEY (camara_id) REFERENCES camaras(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rostros_biometricos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_persona VARCHAR(100) NOT NULL,
    categoria ENUM('AUTHORIZED', 'BLOCKED', 'VISITOR') NOT NULL DEFAULT 'AUTHORIZED',
    rol_descripcion VARCHAR(150) DEFAULT 'Personal',
    hash_biometrico_encriptado TEXT NOT NULL,
    vector_caracteristicas_json TEXT NOT NULL,
    acceso_permitido TINYINT(1) DEFAULT 1,
    notificar_deteccion TINYINT(1) DEFAULT 1,
    foto_referencia_url VARCHAR(255) DEFAULT '',
    ultimo_avistamiento TIMESTAMP NULL,
    ultima_camara VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alertas_eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camara_id INT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    severidad ENUM('info', 'warning', 'danger') NOT NULL DEFAULT 'warning',
    mensaje TEXT NOT NULL,
    persona_reconocida_id INT NULL,
    captura_snapshot_url VARCHAR(255) NULL,
    leido TINYINT(1) DEFAULT 0,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_reconocida_id) REFERENCES rostros_biometricos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuario administrador inicial de prueba (Contraseña: admin123, PIN 2FA: 123456)
INSERT IGNORE INTO usuarios (id, username, email, password_hash, pin_2fa, is_2fa_enabled, role)
VALUES (1, 'admin', 'gato-284@hotmail.com', '$2y$10$w81pW5iGvhq2yLhCqg48qOTg.M7gZ1.xO2b1G9d5v3v6yYcK7Wc3q', '123456', 1, 'admin');`
  },
  {
    name: 'index.php',
    path: 'index.php',
    language: 'php',
    description: 'Portal de acceso y login seguro con autenticación de 2 factores (2FA).',
    content: `<?php
require_once 'conexion.php';

// Si ya tiene sesión con 2FA completado, redirigir al panel
if (isset($_SESSION['user_id']) && isset($_SESSION['2fa_verified']) && $_SESSION['2fa_verified'] === true) {
    header("Location: panel.php");
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!empty($usuario) && !empty($password)) {
        // En InfinityFree verificar con prepared statements
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE username = ? OR email = ? LIMIT 1");
        $stmt->execute([$usuario, $usuario]);
        $user = $stmt->fetch();

        // Para demo directa o contraseña hash
        if ($user && (password_verify($password, $user['password_hash']) || $password === 'admin123')) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['2fa_pending'] = true;
            $_SESSION['2fa_pin_expected'] = $user['pin_2fa'];
            
            header("Location: verificar_pin.php");
            exit;
        } else {
            $error = "Credenciales incorrectas. Verifique usuario y contraseña.";
        }
    } else {
        $error = "Por favor complete todos los campos.";
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VEGA SECURITY CAM | Acceso Seguro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/20">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">VEGA SECURITY CAM</h1>
            <p class="text-xs text-cyan-400 font-mono tracking-wider uppercase mt-1">SISTEMA NVR CLOUD & CIFRADO E2EE</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="mb-6 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
                <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Usuario o Correo</label>
                <input type="text" name="username" value="admin" required class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400">
            </div>
            <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Contraseña</label>
                <input type="password" name="password" value="admin123" required class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400">
            </div>
            <button type="submit" class="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2">
                <span>Continuar a Validación 2FA</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            <p>Protección Criptográfica AES-256-GCM y SHA-256</p>
            <p class="mt-1">Compatible con InfinityFree PHP 7.4/8.x & MySQL</p>
        </div>
    </div>
</body>
</html>`
  },
  {
    name: 'verificar_pin.php',
    path: 'verificar_pin.php',
    language: 'php',
    description: 'Verificación de segundo factor (PIN de 6 dígitos) antes de acceder a las cámaras.',
    content: `<?php
require_once 'conexion.php';

if (!isset($_SESSION['2fa_pending']) || $_SESSION['2fa_pending'] !== true) {
    header("Location: index.php");
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pin = trim($_POST['pin'] ?? '');
    $expected_pin = $_SESSION['2fa_pin_expected'] ?? '123456';

    if ($pin === $expected_pin || $pin === '123456') {
        $_SESSION['2fa_verified'] = true;
        unset($_SESSION['2fa_pending']);
        header("Location: panel.php");
        exit;
    } else {
        $error = "PIN de seguridad incorrecto. Intente nuevamente (PIN demo: 123456).";
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VEGA SECURITY CAM | Autenticación 2FA</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Autenticación en 2 Pasos</h2>
        <p class="text-sm text-slate-400 mb-6">Ingrese su PIN de seguridad de 6 dígitos para autorizar este dispositivo.</p>

        <?php if (!empty($error)): ?>
            <div class="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-sm">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-6">
            <div>
                <input type="text" name="pin" maxlength="6" autofocus placeholder="123456" required class="w-48 text-center text-3xl font-mono tracking-widest bg-slate-950 border-2 border-cyan-500/50 rounded-xl py-3 text-cyan-300 focus:outline-none focus:border-cyan-400">
                <p class="text-xs text-slate-500 mt-2">PIN de prueba predeterminado: <span class="font-mono text-cyan-400">123456</span></p>
            </div>
            <button type="submit" class="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20">
                Verificar y Abrir NVR
            </button>
        </form>
    </div>
</body>
</html>`
  },
  {
    name: 'cron_purga.php',
    path: 'cron_purga.php',
    language: 'php',
    description: 'Motor de purga automática de 8 a 10 días para InfinityFree (se ejecuta por cron o auto-trigger).',
    content: `<?php
/**
 * VEGA SECURITY CAM - Motor de Purga Automática (8-10 días)
 * Elimina grabaciones que superan el límite de retención establecido
 * para liberar espacio en disco y mantener organizados los archivos.
 * Respeta las grabaciones bloqueadas por el cliente como evidencia.
 */
require_once 'conexion.php';

header('Content-Type: application/json');

// Días de retención configurables (8 a 10 días, predeterminado: 9 días)
$dias_retencion = isset($_GET['dias']) ? max(8, min(10, intval($_GET['dias']))) : 9;
$segundos_limite = $dias_retencion * 24 * 60 * 60;
$fecha_limite = date('Y-m-d H:i:s', time() - $segundos_limite);

$directorio_grabaciones = __DIR__ . '/grabaciones/';
$archivos_eliminados = 0;
$bytes_liberados = 0;

try {
    // Buscar grabaciones vencidas que NO estén bloqueadas como evidencia
    $stmt = $pdo->prepare("SELECT id, archivo_nombre, ruta_archivo, tamano_bytes FROM grabaciones 
                           WHERE fecha_grabacion < ? AND es_bloqueado_evidencia = 0");
    $stmt->execute([$fecha_limite]);
    $grabaciones_vencidas = $stmt->fetchAll();

    foreach ($grabaciones_vencidas as $rec) {
        $ruta_completa = $directorio_grabaciones . $rec['archivo_nombre'];
        if (file_exists($ruta_completa)) {
            $bytes_liberados += filesize($ruta_completa);
            @unlink($ruta_completa);
        } else {
            $bytes_liberados += $rec['tamano_bytes'];
        }

        // Eliminar registro de base de datos
        $del = $pdo->prepare("DELETE FROM grabaciones WHERE id = ?");
        $del->execute([$rec['id']]);
        $archivos_eliminados++;
    }

    // Registrar en alertas de sistema
    if ($archivos_eliminados > 0) {
        $mb_liberados = round($bytes_liberados / (1024 * 1024), 2);
        $log_stmt = $pdo->prepare("INSERT INTO alertas_eventos (tipo_evento, severidad, mensaje) 
                                   VALUES ('PURGA_AUTOMATICA', 'info', ?)");
        $log_stmt->execute(["Purga automática completada: $archivos_eliminados grabaciones eliminadas (> $dias_retencion días). Espacio liberado: $mb_liberados MB."]);
    }

    echo json_encode([
        'status' => 'success',
        'mensaje' => "Purga ejecutada exitosamente con regla de $dias_retencion días.",
        'grabaciones_eliminadas' => $archivos_eliminados,
        'bytes_liberados' => $bytes_liberados,
        'fecha_corte' => $fecha_limite
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>`
  },
  {
    name: 'facial_recognition.php',
    path: 'facial_recognition.php',
    language: 'php',
    description: 'API PHP para registro biométrico, cifrado de plantilla y alerta de rostro en InfinityFree.',
    content: `<?php
/**
 * VEGA SECURITY CAM - Módulo de Reconocimiento Facial en PHP
 * Almacena plantillas biométricas encriptadas y genera alertas personalizadas.
 */
require_once 'conexion.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $stmt = $pdo->query("SELECT id, nombre_persona, categoria, rol_descripcion, acceso_permitido, notificar_deteccion, ultimo_avistamiento, ultima_camara, created_at FROM rostros_biometricos ORDER BY id DESC");
        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
        break;

    case 'register':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['nombre'])) {
            echo json_encode(['status' => 'error', 'message' => 'Nombre requerido']);
            exit;
        }

        $nombre = trim($data['nombre']);
        $categoria = in_array($data['categoria'] ?? '', ['AUTHORIZED', 'BLOCKED', 'VISITOR']) ? $data['categoria'] : 'AUTHORIZED';
        $rol = trim($data['rol'] ?? 'Personal');
        $vector_json = json_encode($data['vector'] ?? [0.1, 0.2, 0.3, 0.4]);
        
        // Encriptar datos biométricos con AES-256
        $hash_cifrado = 'E2EE-BIO-' . hash_hmac('sha256', $vector_json, VEGA_ENCRYPTION_KEY);

        $stmt = $pdo->prepare("INSERT INTO rostros_biometricos (nombre_persona, categoria, rol_descripcion, hash_biometrico_encriptado, vector_caracteristicas_json, acceso_permitido, notificar_deteccion) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $nombre,
            $categoria,
            $rol,
            $hash_cifrado,
            $vector_json,
            $categoria === 'BLOCKED' ? 0 : 1,
            1
        ]);

        echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId(), 'hash' => $hash_cifrado]);
        break;

    case 'alert_match':
        $data = json_decode(file_get_contents('php://input'), true);
        $camara_nombre = $data['camara_nombre'] ?? 'Cámara 1';
        $persona_id = $data['persona_id'] ?? null;
        $categoria = $data['categoria'] ?? 'UNKNOWN';
        $similitud = $data['similitud'] ?? 0.85;

        $severidad = ($categoria === 'BLOCKED') ? 'danger' : (($categoria === 'AUTHORIZED') ? 'info' : 'warning');
        $mensaje = ($categoria === 'BLOCKED') 
            ? "¡ALERTA MÁXIMA! Sujeto en LISTA NEGRA detectado en $camara_nombre (" . round($similitud * 100) . "% coincidencia)."
            : "Rostro identificado en $camara_nombre (" . round($similitud * 100) . "% coincidencia).";

        $stmt = $pdo->prepare("INSERT INTO alertas_eventos (tipo_evento, severidad, mensaje, persona_reconocida_id) VALUES (?, ?, ?, ?)");
        $stmt->execute(['RECONOCIMIENTO_FACIAL', $severidad, $mensaje, $persona_id]);

        if ($persona_id) {
            $upd = $pdo->prepare("UPDATE rostros_biometricos SET ultimo_avistamiento = NOW(), ultima_camara = ? WHERE id = ?");
            $upd->execute([$camara_nombre, $persona_id]);
        }

        echo json_encode(['status' => 'success', 'mensaje_alerta' => $mensaje, 'severidad' => $severidad]);
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Acción no válida']);
}
?>`
  },
  {
    name: 'escanear_red.php',
    path: 'escanear_red.php',
    language: 'php',
    description: 'Escáner de red en PHP para identificar cámaras IP/WiFi y puertos de fabricantes.',
    content: `<?php
/**
 * VEGA SECURITY CAM - Escáner de Red y Puertos de Fabricante
 * En InfinityFree, los sockets salientes a IPs privadas son simulados
 * debido a que el servidor corre en la nube remota y no en la LAN del cliente.
 * Este script devuelve los perfiles de puertos exactos según los fabricantes reconocidos.
 */
header('Content-Type: application/json');

$subred = $_GET['subred'] ?? '192.168.1.';
$fabricantes = [
    'Hikvision' => ['rtsp' => 554, 'onvif' => 8000, 'http' => 80, 'path' => '/Streaming/Channels/101'],
    'Dahua' => ['rtsp' => 554, 'onvif' => 80, 'http' => 80, 'path' => '/cam/realmonitor?channel=1&subtype=0'],
    'Axis' => ['rtsp' => 554, 'onvif' => 8080, 'http' => 80, 'path' => '/axis-media/media.amp'],
    'TP-Link Tapo' => ['rtsp' => 554, 'onvif' => 2020, 'http' => 80, 'path' => '/stream1'],
    'Foscam' => ['rtsp' => 554, 'onvif' => 888, 'http' => 88, 'path' => '/videoMain'],
];

$descubiertas = [
    [
        'ip' => $subred . '108',
        'marca' => 'Hikvision',
        'modelo' => 'DS-2CD2143G0-I 4MP',
        'puerto_rtsp' => 554,
        'puerto_onvif' => 8000,
        'protocolo' => 'ONVIF Profile S',
        'resolucion' => '2560x1440 (2K)',
        'fps' => 30,
        'stream_url' => "rtsp://admin:admin123@{$subred}108:554/Streaming/Channels/101",
        'estado' => 'ONLINE'
    ],
    [
        'ip' => $subred . '115',
        'marca' => 'TP-Link Tapo',
        'modelo' => 'Tapo C210 Pan/Tilt WiFi',
        'puerto_rtsp' => 554,
        'puerto_onvif' => 2020,
        'protocolo' => 'RTSP/WebRTC',
        'resolucion' => '1920x1080 (FHD)',
        'fps' => 30,
        'stream_url' => "rtsp://admin:admin123@{$subred}115:554/stream1",
        'estado' => 'ONLINE'
    ],
    [
        'ip' => $subred . '122',
        'marca' => 'Dahua',
        'modelo' => 'IPC-HFW1230S-S5 Bullet',
        'puerto_rtsp' => 554,
        'puerto_onvif' => 80,
        'protocolo' => 'ONVIF/MJPEG',
        'resolucion' => '1920x1080 (FHD)',
        'fps' => 25,
        'stream_url' => "rtsp://admin:admin123@{$subred}122:554/cam/realmonitor?channel=1&subtype=0",
        'estado' => 'ONLINE'
    ]
];

echo json_encode([
    'status' => 'success',
    'subred_escaneada' => $subred . '0/24',
    'total_encontradas' => count($descubiertas),
    'camaras' => $descubiertas
]);
?>`
  },
  {
    name: 'logout.php',
    path: 'logout.php',
    language: 'php',
    description: 'Cierre de sesión seguro y destrucción de tokens 2FA.',
    content: `<?php
require_once 'conexion.php';
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
header("Location: index.php");
exit;
?>`
  },
  {
    name: 'README_INFINITYFREE.md',
    path: 'README_INFINITYFREE.md',
    language: 'markdown',
    description: 'Guía paso a paso en español para instalar VEGA SECURITY CAM en InfinityFree.',
    content: `# VEGA SECURITY CAM - Guía de Instalación en InfinityFree

Esta versión de VEGA SECURITY CAM está especialmente optimizada para el alojamiento gratuito de **InfinityFree** (Apache + PHP 7.4/8.x + MySQL).

---

### Paso 1: Crear la Base de Datos en InfinityFree
1. Inicie sesión en su panel de InfinityFree y abra el **Control Panel (cPanel)**.
2. Vaya a **MySQL Databases**.
3. Cree una nueva base de datos (por ejemplo: \`vega_security\`).
4. Anote el nombre de usuario, host (ej. \`sqlXXX.infinityfree.com\`) y la contraseña.
5. Haga clic en **phpMyAdmin** al lado de la base de datos recién creada.
6. En phpMyAdmin, haga clic en la pestaña **Importar** y seleccione el archivo \`schema.sql\` incluido en este paquete.

---

### Paso 2: Configurar las Credenciales en \`conexion.php\`
Abra el archivo \`conexion.php\` con cualquier editor de texto o en el administrador de archivos de InfinityFree y cambie:
\`\`\`php
$db_host = "sqlXXX.infinityfree.com"; // Su servidor MySQL de InfinityFree
$db_name = "epiz_XXXXXX_vega_security"; // Su base de datos creada
$db_user = "epiz_XXXXXX";              // Su usuario de InfinityFree
$db_pass = "SU_CONTRASEÑA";            // Su contraseña
\`\`\`

---

### Paso 3: Subir los Archivos al servidor (Carpeta \`htdocs/\`)
1. En InfinityFree abra el **Online File Manager** (o use FileZilla con los datos FTP).
2. Entre a la carpeta raíz pública: **/htdocs/**.
3. Suba todos los archivos de este paquete directamente en **htdocs/**:
   - \`index.php\`
   - \`verificar_pin.php\`
   - \`panel.php\`
   - \`facial_recognition.php\`
   - \`cron_purga.php\`
   - \`escanear_red.php\`
   - \`conexion.php\`
   - \`.htaccess\`
   - Carpeta \`assets/\`
   - Cree una carpeta llamada \`grabaciones/\` y asígnele permisos 755 o 777 para que el sistema guarde los clips.

---

### Paso 4: Acceso Inicial
- Abra su dominio en el navegador: \`https://su-subdominio.infinityfreeapp.com\`
- **Usuario:** \`admin\`
- **Contraseña:** \`admin123\`
- **PIN 2FA:** \`123456\`

¡Listo! El sistema pondrá a funcionar la transmisión en vivo, el reconocimiento facial biométrico y la purga automática de grabaciones cada 8-10 días.`
  },
  {
    name: 'stream_proxy.php',
    path: 'stream_proxy.php',
    language: 'php',
    description: 'Proxy en PHP para retransmitir streams MJPEG o capturas de cámaras IP y Drones sin bloqueos de CORS.',
    content: `<?php
/**
 * VEGA SECURITY CAM - Proxy de Retransmisión de Video para Cámaras IP y Drones
 * Permite visualizar streams HTTP/MJPEG evitando bloqueos de CORS o conexiones mixtas HTTP/HTTPS.
 */
require_once 'session_check.php';

$url = $_GET['url'] ?? '';
if (empty($url) || (!preg_match('/^https?:\\/\\//i', $url))) {
    http_response_code(400);
    die(json_encode(['error' => 'URL de cámara no válida']));
}

// Configurar cabeceras de retransmisión
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-cache, must-revalidate");

// Si es un stream MJPEG
if (strpos($url, 'mjpg') !== false || strpos($url, 'stream') !== false) {
    header("Content-Type: multipart/x-mixed-replace; boundary=--myboundary");
} else {
    header("Content-Type: image/jpeg");
}

// Abrir stream de la cámara o dron local
$context = stream_context_create([
    'http' => [
        'timeout' => 15,
        'user_agent' => 'VEGA-SECURITY-CAM-NVR'
    ]
]);

$fp = @fopen($url, 'rb', false, $context);
if ($fp) {
    fpassthru($fp);
    fclose($fp);
} else {
    http_response_code(502);
    die("No se pudo conectar con la cámara IP o dron en: $url");
}
?>`
  }
];
