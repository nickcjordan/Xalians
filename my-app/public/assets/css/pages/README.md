One CSS file per area of the site, for compositions specific to that page.
No colors: every value here reads a token from system.css, never a raw hex.
Loaded from index.html, after system.css, so tokens are already defined.
File per terminal/area, not per component: relay.css, field.css, archive.css,
registry.css, home.css. Add a new one the same way when a new area migrates.
