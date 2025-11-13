# Conversor Hex → Bin


Archivos principales:

- `hex to bin.html` — Página HTML principal (ahora enlaza `css/style.css` y `js/script.js`).
- `css/style.css` — Estilos extraídos del HTML original.
- `js/script.js` — Lógica de conversión (convertir hex a bytes, descargar como .bin/.gz).

Cómo usar:

1. Abre `hex to bin.html` en tu navegador (doble clic o arrastrar al navegador).
2. Pega los datos hexadecimales en el textarea (puedes incluir o no el prefijo `0x`).
3. Haz clic en "Convertir". Si la conversión es exitosa, habilitará el botón "Descargar .bin".
4. Si el archivo detectado es GZIP, también se mostrará "Descargar .gz".

Notas y compatibilidad:

- El proyecto está pensado para abrirse directamente en un navegador. La lectura automática de `hex.txt` solo funcionará si tu entorno expone `window.fs.readFile` (por ejemplo, una app Electron o un entorno con esa API). Si no, esa carga falla silenciosamente y no afectará al resto.

Siguientes pasos recomendados:

- (Opcional) Renombrar `hex to bin.html` a `index.html` si quieres que sea la página por defecto en servidores.