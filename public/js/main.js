import { bindUploadUI } from './upload.js';
import { initViewer } from './viewer.js';
import { initLightRays } from './lightRays.js';
import { initElectricBorder } from './electricBorder.js';
import { initSpotlight } from './spotlightCard.js';
window.addEventListener('load', ()=>{ /* captcha created only when files picked */ });
bindUploadUI(); initViewer(); initLightRays(); initElectricBorder(); initSpotlight();