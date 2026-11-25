"use client";

// Paiement en ligne d'un palier (SasPay) : savoir s'il est proposé à ce compte, puis ouvrir la page de paiement.
// Le prix est recalculé par le serveur (app/api/premium/checkout).
import { useEffect, useState } from 'react';

export function useOnlinePayment() {
  const [enabled, setEnabled] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/premium/checkout').then((r) => r.json()).then((d) => { if (alive) setEnabled(Boolean(d?.enabled)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const pay = async (tier: string) => {
    setPaying(tier);
    setError(null);
    try {
      const res = await fetch('/api/premium/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || 'Le paiement n’a pas pu être préparé.');
      window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le paiement n’a pas pu être préparé.');
      setPaying(null);
    }
  };

  return { enabled, paying, error, pay };
}
