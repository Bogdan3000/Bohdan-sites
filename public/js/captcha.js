import { els } from './dom.js';
import { show, hide } from './utils.js';
let turnstileToken = ''; let turnstileWidgetId = null;
export function createCaptcha(){ if (turnstileWidgetId || !window.turnstile) return; show(els.turnstileContainer); turnstileWidgetId = window.turnstile.render('#turnstile-container',{sitekey:'0x4AAAAAAByTHJ7wWbBRcuyf',theme:'dark',callback:(t)=>{turnstileToken=t;},'error-callback':()=>{turnstileToken='';},'expired-callback':()=>{turnstileToken='';}}); }
export function destroyCaptcha(){ if (turnstileWidgetId && window.turnstile){ try{ window.turnstile.remove(turnstileWidgetId);}catch{} turnstileWidgetId=null; turnstileToken=''; } hide(els.turnstileContainer); els.turnstileContainer.innerHTML=''; }
export async function ensureCaptcha(){ if (window.turnstile && turnstileWidgetId){ const t=window.turnstile.getResponse(turnstileWidgetId); if(t){turnstileToken=t;} if(!turnstileToken){ try{ window.turnstile.reset(turnstileWidgetId);}catch{} } } if(!turnstileToken) throw new Error('Please complete the captcha'); return turnstileToken; }
