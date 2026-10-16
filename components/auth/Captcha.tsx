"use client";

// Vérification anti-robot (Cloudflare Turnstile) pour l'inscription, la connexion par mot de passe
// et la demande de nouveau mot de passe. Le plus souvent invisible : Cloudflare ne demande un geste
// (case à cocher) que si le comportement paraît suspect.
// Sans NEXT_PUBLIC_TURNSTILE_SITE_KEY, rien ne s'affiche et les formulaires fonctionnent comme avant :
// on déploie d'abord ce code avec la clé, puis on active la protection dans Supabase
// (Authentication > Attack Protection > Captcha, fournisseur Turnstile, clé secrète).
import React, { useEffect, useRef } from 'react';

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
export const captchaEnabled = Boolean(CAPTCHA_SITE_KEY);

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Message en français quand Supabase refuse une demande faute de vérification valide
export function isCaptchaError(error: { message?: string } | null | undefined) {
  return /captcha/i.test(error?.message ?? '');
}
export const CAPTCHA_ERROR_FR = 'La vérification anti-robot a échoué ou a expiré. Réessayez.';

export default function Captcha({ onToken, resetSignal = 0 }: {
  onToken: (token: string | null) => void;
  resetSignal?: number; // à incrémenter après chaque envoi : un jeton ne sert qu'une fois
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenCb = useRef(onToken);
  useEffect(() => { tokenCb.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!captchaEnabled || !box.current) return;
    let alive = true;
    loadTurnstile().then((t) => {
      if (!alive || !box.current || widget.current) return;
      widget.current = t.render(box.current, {
        sitekey: CAPTCHA_SITE_KEY,
        appearance: 'interaction-only',
        language: 'fr',
        theme: 'light',
        callback: (token: string) => tokenCb.current(token),
        'expired-callback': () => tokenCb.current(null),
        'error-callback': () => tokenCb.current(null),
      });
    }).catch(() => tokenCb.current(null));
    return () => {
      alive = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetSignal && widget.current && window.turnstile) { tokenCb.current(null); window.turnstile.reset(widget.current); }
  }, [resetSignal]);

  if (!captchaEnabled) return null;
  return <div ref={box} className="flex min-h-0 justify-center [&:empty]:hidden" />;
}
