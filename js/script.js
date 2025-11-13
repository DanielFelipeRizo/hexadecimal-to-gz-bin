'use strict';

let binaryData = null;
let isGzip = false;

function convertHex() {
    const hexInput = document.getElementById('hexInput').value.trim();
    const infoBox = document.getElementById('infoBox');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadGzBtn = document.getElementById('downloadGzBtn');

    if (!hexInput) {
        showMessage('Por favor, ingresa datos hexadecimales', 'error');
        return;
    }

    try {
        // Limpiar el input: remover espacios, saltos de línea y prefijo 0x
        let cleanHex = hexInput.replace(/\s+/g, '').replace(/^0x/i, '');

        // Validar que solo contenga caracteres hexadecimales
        if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
            throw new Error('El texto contiene caracteres no hexadecimales');
        }

        // Si la longitud es impar, agregar un 0 al inicio
        if (cleanHex.length % 2 !== 0) {
            cleanHex = '0' + cleanHex;
        }

        // Convertir hex a bytes
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
        }

        binaryData = bytes;

        // Detectar tipo de archivo
        let fileType = 'Desconocido';
        isGzip = false;

        if (bytes[0] === 0x1F && bytes[1] === 0x8B) {
            fileType = 'GZIP comprimido';
            isGzip = true;
            downloadGzBtn.style.display = 'block';
            downloadGzBtn.disabled = false;
        } else if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
            fileType = 'ZIP';
        } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            fileType = 'PNG';
        } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
            fileType = 'JPEG';
        } else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
            fileType = 'PDF';
        }

        // Mostrar los primeros bytes en hex para verificación
        const preview = Array.from(bytes.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');

        showMessage(`✅ Conversión exitosa<br><strong>Tamaño:</strong> ${bytes.length.toLocaleString()} bytes<br><strong>Tipo detectado:</strong> ${fileType}<br><strong>Primeros bytes:</strong> ${preview}...`, 'success');
        downloadBtn.disabled = false;

    } catch (error) {
        showMessage(`❌ Error: ${error.message}`, 'error');
        binaryData = null;
        downloadBtn.disabled = true;
        downloadGzBtn.disabled = true;
        downloadGzBtn.style.display = 'none';
    }
}

function downloadBin() {
    if (!binaryData) {
        showMessage('No hay datos para descargar', 'error');
        return;
    }

    // Crear blob con tipo application/octet-stream
    const blob = new Blob([binaryData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archivo.bin';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Limpiar después de un pequeño delay
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showMessage('📥 Archivo .bin descargado exitosamente', 'success');
}

function downloadGz() {
    if (!binaryData) {
        showMessage('No hay datos para descargar', 'error');
        return;
    }

    // Crear blob con tipo específico para gzip
    const blob = new Blob([binaryData], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archivo.gz';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Limpiar después de un pequeño delay
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showMessage('📥 Archivo .gz descargado exitosamente - Puedes descomprimirlo con 7-Zip, WinRAR o gunzip', 'success');
}

function showMessage(message, type) {
    const infoBox = document.getElementById('infoBox');
    infoBox.innerHTML = message;
    infoBox.className = `info-box show ${type}`;
}

// Auto-cargar el contenido del archivo hex.txt si está disponible en entornos que lo soporten
window.addEventListener('load', async () => {
    try {
        // Nota: window.fs no es estándar en navegadores normales. Está aquí para entornos
        // que expongan una API de archivos en window (por ejemplo, ciertas apps Electron o entornos personalizados).
        if (window.fs && typeof window.fs.readFile === 'function') {
            const hexData = await window.fs.readFile('hex.txt', { encoding: 'utf8' });
            document.getElementById('hexInput').value = hexData;
            showMessage('ℹ️ Datos cargados desde hex.txt - Haz clic en "Convertir"', 'success');
        }
    } catch (error) {
        console.log('No se pudo cargar hex.txt automáticamente');
    }
});
