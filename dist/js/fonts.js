﻿// If custom fonts are provided, import them
if (window.__settings.app.web_font_import) {
    var fontImport = document.createElement("link");
    fontImport.setAttribute("rel", "stylesheet");
    fontImport.setAttribute("type", "text/css");
    fontImport.setAttribute("href", window.__settings.app.web_font_import);
    document.head.appendChild(fontImport);
}