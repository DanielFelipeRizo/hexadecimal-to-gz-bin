'use strict';

let binaryData = null;
let detectedType = null;
let hexFromFile = '';

// Mapa de magic bytes para detectar tipo de archivo
const FILE_SIGNATURES = [
    { bytes: [0x1F, 0x8B], ext: 'gz', type: 'application/gzip', name: 'GZIP comprimido' },
    { bytes: [0x50, 0x4B, 0x03, 0x04], ext: 'zip', type: 'application/zip', name: 'ZIP' },
    { bytes: [0x50, 0x4B, 0x05, 0x06], ext: 'zip', type: 'application/zip', name: 'ZIP (vacío)' },
    { bytes: [0x50, 0x4B, 0x07, 0x08], ext: 'zip', type: 'application/zip', name: 'ZIP (spanned)' },
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A], ext: 'png', type: 'image/png', name: 'PNG' },
    { bytes: [0xFF, 0xD8, 0xFF], ext: 'jpg', type: 'image/jpeg', name: 'JPEG' },
    { bytes: [0x25, 0x50, 0x44, 0x46], ext: 'pdf', type: 'application/pdf', name: 'PDF' },
    { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif', type: 'image/gif', name: 'GIF' },
    { bytes: [0x42, 0x4D], ext: 'bmp', type: 'image/bmp', name: 'BMP' },
    { bytes: [0x52, 0x49, 0x46, 0x46], ext: 'wav', type: 'audio/wav', name: 'WAV/AVI (RIFF)' },
    { bytes: [0x49, 0x44, 0x33], ext: 'mp3', type: 'audio/mpeg', name: 'MP3 (ID3)' },
    { bytes: [0x4F, 0x67, 0x67, 0x53], ext: 'ogg', type: 'audio/ogg', name: 'OGG' },
    { bytes: [0x66, 0x74, 0x79, 0x70], ext: 'mp4', type: 'video/mp4', name: 'MP4' }, // offset 4 normalmente
    { bytes: [0x7F, 0x45, 0x4C, 0x46], ext: 'elf', type: 'application/x-elf', name: 'ELF (Linux executable)' },
    { bytes: [0x4D, 0x5A], ext: 'exe', type: 'application/x-msdownload', name: 'EXE/DLL (Windows)' },
    { bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], ext: '7z', type: 'application/x-7z-compressed', name: '7-Zip' },
    { bytes: [0xFD, 0x37, 0x7A, 0x58, 0x5A], ext: 'xz', type: 'application/x-xz', name: 'XZ comprimido' },
    { bytes: [0x42, 0x5A, 0x68], ext: 'bz2', type: 'application/x-bzip2', name: 'BZip2' },
    { bytes: [0x75, 0x73, 0x74, 0x61, 0x72], ext: 'tar', type: 'application/x-tar', name: 'TAR' }, // offset 257
    { bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1], ext: 'doc', type: 'application/msword', name: 'MS Office (antiguo)' },
    { bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07], ext: 'rar', type: 'application/x-rar-compressed', name: 'RAR' },
    { bytes: [0x00, 0x00, 0x01, 0x00], ext: 'ico', type: 'image/x-icon', name: 'ICO' },
    { bytes: [0x49, 0x49, 0x2A, 0x00], ext: 'tif', type: 'image/tiff', name: 'TIFF (little-endian)' },
    { bytes: [0x4D, 0x4D, 0x00, 0x2A], ext: 'tif', type: 'image/tiff', name: 'TIFF (big-endian)' },
    { bytes: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], ext: 'sqlite', type: 'application/x-sqlite3', name: 'SQLite' },
];

/**
 * Detecta el tipo de archivo basándose en los magic bytes
 */
function detectFileType(bytes) {
    for (const sig of FILE_SIGNATURES) {
        if (bytes.length >= sig.bytes.length) {
            let match = true;
            for (let i = 0; i < sig.bytes.length; i++) {
                if (bytes[i] !== sig.bytes[i]) {
                    match = false;
                    break;
                }
            }
            if (match) return sig;
        }
    }
    // Chequeo especial para TAR (magic bytes en offset 257)
    if (bytes.length > 262) {
        const tarMagic = [0x75, 0x73, 0x74, 0x61, 0x72];
        let isTar = true;
        for (let i = 0; i < tarMagic.length; i++) {
            if (bytes[257 + i] !== tarMagic[i]) {
                isTar = false;
                break;
            }
        }
        if (isTar) return { ext: 'tar', type: 'application/x-tar', name: 'TAR' };
    }
    // Chequeo especial para MP4 (ftyp en offset 4)
    if (bytes.length > 8) {
        const ftypMagic = [0x66, 0x74, 0x79, 0x70];
        let isMp4 = true;
        for (let i = 0; i < ftypMagic.length; i++) {
            if (bytes[4 + i] !== ftypMagic[i]) {
                isMp4 = false;
                break;
            }
        }
        if (isMp4) return { ext: 'mp4', type: 'video/mp4', name: 'MP4/M4A' };
    }
    return { ext: 'bin', type: 'application/octet-stream', name: 'Desconocido' };
}

/**
 * Manejo de carga de archivo .txt
 */
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileStatus = document.getElementById('fileStatus');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            fileStatus.textContent = 'Ningún archivo seleccionado';
            hexFromFile = '';
            return;
        }

        fileStatus.textContent = `⏳ Leyendo ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`;

        const reader = new FileReader();
        reader.onload = (event) => {
            hexFromFile = event.target.result;
            const charCount = hexFromFile.length;
            fileStatus.textContent = `✅ ${file.name} cargado — ${charCount.toLocaleString()} caracteres`;
            showMessage(`📄 Archivo "${file.name}" cargado correctamente (${charCount.toLocaleString()} caracteres). Haz clic en <strong>Convertir</strong>.`, 'success');
        };
        reader.onerror = () => {
            fileStatus.textContent = '❌ Error al leer el archivo';
            showMessage('❌ Error al leer el archivo', 'error');
        };
        reader.readAsText(file);
    });
});

/**
 * Función principal de conversión
 */
function convertHex() {
    // Prioridad: archivo cargado > textarea
    const hexTextarea = document.getElementById('hexInput').value.trim();
    const rawHex = hexFromFile.trim() || hexTextarea;
    const infoBox = document.getElementById('infoBox');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (!rawHex) {
        showMessage('⚠️ Por favor, carga un archivo .txt o pega datos hexadecimales', 'error');
        return;
    }

    try {
        showMessage('⏳ Procesando... Limpiando datos hexadecimales...', 'success');
        progressContainer.style.display = 'block';
        progressBar.style.width = '10%';
        progressText.textContent = '10%';

        // Usar setTimeout para permitir que se renderice el UI antes del procesamiento pesado
        setTimeout(() => {
            try {
                // Limpiar el input: remover espacios, saltos de línea, tabulaciones y prefijo 0x
                let cleanHex = rawHex.replace(/[\s\r\n\t]+/g, '').replace(/^0x/i, '');
                // También remover separadores comunes como comas, puntos, guiones, dos puntos
                cleanHex = cleanHex.replace(/[,.\-:;]/g, '');

                progressBar.style.width = '30%';
                progressText.textContent = '30%';

                // Validar que solo contenga caracteres hexadecimales
                if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
                    // Intentar encontrar la posición del primer carácter inválido
                    const invalidMatch = cleanHex.match(/[^0-9A-Fa-f]/);
                    const pos = cleanHex.indexOf(invalidMatch[0]);
                    throw new Error(`Carácter no hexadecimal '${invalidMatch[0]}' encontrado en posición ${pos}`);
                }

                // Si la longitud es impar, agregar un 0 al inicio
                if (cleanHex.length % 2 !== 0) {
                    cleanHex = '0' + cleanHex;
                }

                progressBar.style.width = '50%';
                progressText.textContent = '50%';

                // Convertir hex a bytes — procesamiento por bloques para cadenas grandes
                const totalBytes = cleanHex.length / 2;
                const bytes = new Uint8Array(totalBytes);
                const CHUNK = 65536; // Procesar en bloques de 64K

                for (let offset = 0; offset < totalBytes; offset += CHUNK) {
                    const end = Math.min(offset + CHUNK, totalBytes);
                    for (let i = offset; i < end; i++) {
                        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
                    }
                }

                progressBar.style.width = '80%';
                progressText.textContent = '80%';

                binaryData = bytes;

                // Detectar tipo de archivo
                detectedType = detectFileType(bytes);

                // Vista previa de los primeros bytes
                const previewLen = Math.min(bytes.length, 32);
                const preview = Array.from(bytes.slice(0, previewLen))
                    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ');

                // Formato de tamaño legible
                let sizeStr;
                if (bytes.length >= 1048576) {
                    sizeStr = `${(bytes.length / 1048576).toFixed(2)} MB`;
                } else if (bytes.length >= 1024) {
                    sizeStr = `${(bytes.length / 1024).toFixed(2)} KB`;
                } else {
                    sizeStr = `${bytes.length} bytes`;
                }

                progressBar.style.width = '100%';
                progressText.textContent = '100%';

                // Actualizar botón de descarga
                downloadBtn.disabled = false;
                downloadBtn.textContent = `⬇️ Descargar .${detectedType.ext}`;

                showMessage(
                    `✅ <strong>Conversión exitosa</strong><br>` +
                    `<strong>Tamaño:</strong> ${sizeStr} (${bytes.length.toLocaleString()} bytes)<br>` +
                    `<strong>Tipo detectado:</strong> 📦 ${detectedType.name} (.${detectedType.ext})<br>` +
                    `<strong>Primeros bytes:</strong> <code>${preview}${bytes.length > previewLen ? ' ...' : ''}</code>`,
                    'success'
                );

                // Ocultar progreso después de un momento
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1500);

            } catch (error) {
                showMessage(`❌ Error: ${error.message}`, 'error');
                binaryData = null;
                detectedType = null;
                downloadBtn.disabled = true;
                downloadBtn.textContent = 'Descargar Archivo';
                progressContainer.style.display = 'none';
            }
        }, 50);

    } catch (error) {
        showMessage(`❌ Error: ${error.message}`, 'error');
        binaryData = null;
        detectedType = null;
        downloadBtn.disabled = true;
        progressContainer.style.display = 'none';
    }
}

/**
 * Descarga el archivo con la extensión correcta según el tipo detectado
 */
function downloadFile() {
    if (!binaryData || !detectedType) {
        showMessage('No hay datos para descargar', 'error');
        return;
    }

    const blob = new Blob([binaryData], { type: detectedType.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archivo.${detectedType.ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showMessage(`📥 Archivo <strong>archivo.${detectedType.ext}</strong> descargado exitosamente (${detectedType.name})`, 'success');
}

function showMessage(message, type) {
    const infoBox = document.getElementById('infoBox');
    infoBox.innerHTML = message;
    infoBox.className = `info-box show ${type}`;
}
