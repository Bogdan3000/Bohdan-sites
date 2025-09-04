import { bindUploadUI } from './upload.js';
import { initViewer } from './viewer.js';
import { initLightRays } from './lightRays.js';
window.addEventListener('load', ()=>{ /* captcha created only when files picked */ });
+bindUploadUI();
+initViewer();
+initLightRays();
