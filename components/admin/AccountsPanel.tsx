"use client";

// Administration · comptes sans mariage : inscrits sans fiche mariage (création échouée, fiche supprimée
// à la main, compte de test, compte administrateur…) et anciennes lignes « profiles » sans compte.
import React, { useState } from 'react';
import { HeartPlus, Loader2, ShieldCheck, Trash2, UserX, Eraser } from 'lucide-react';
import { useConfirm } from '../ui/ConfirmDialog';
import { fmtDate } from './CoupleDrawer';

export type AdminAccount = {
  id: string; email: string | null; phone: string | null; provider: string | null; admin: boolean;
  names: string | null; weddingDate: string | null; confirmed: boolean;
  createdAt: string | null; lastSignIn: string | null; banned: boolean;
};

const via = (p: string | null) => (p === 'google' ? 'Google' : p === 'facebook' ? 'Facebook' : p === 'email' ? 'E-mail' : p ?? '—');

export default function AccountsPanel({ accounts, strayProfiles, ready, onAction }: {
  accounts: AdminAccount[];
  strayProfiles: string[];
  ready: boolean;
  onAction: (id: string, action: 'create_marriage' | 'delete' | 'delete_profile') => Promise<boolean>;
}) {
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, id: string, action: 'create_marriage' | 'delete' | 'delete_profile') => {
    setBusy(key);
    await onAction(id, action);
    setBusy(null);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl text-ink"><UserX className="h-5 w-5 text-rose-500" /> Comptes sans mariage</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Ces personnes ont un compte de connexion mais pas de fiche mariage : elles n’apparaissent pas dans « Couples » et ne peuvent pas utiliser leur espace.
          Cas habituels : votre compte administrateur (normal), un compte de test, une fiche supprimée à la main, ou une inscription dont la fiche n’a pas été créée.
        </p>
        {!ready && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La liste des comptes de connexion n’a pas pu être lue en entier : réessayez avec « Actualiser ».</p>}
      </div>

      {ready && accounts.length === 0 && strayProfiles.length === 0 && (
        <p className="rounded-2xl bg-white py-10 text-center text-slate-500 ring-1 ring-slate-200">Aucun compte sans mariage : chaque compte a sa fiche.</p>
      )}

      {accounts.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {accounts.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{a.email ?? 'Sans e-mail'}</p>
                  <p className="text-sm text-slate-500">{a.names ?? 'Prénoms non renseignés'}{a.phone ? ` · ${a.phone}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.admin && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-amber-300"><ShieldCheck className="h-3 w-3" /> Administrateur</span>}
                  {a.banned && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Désactivé</span>}
                  {!a.confirmed && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">E-mail non confirmé</span>}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
                <div><dt className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Inscription</dt><dd>{via(a.provider)}</dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Inscrit le</dt><dd>{fmtDate(a.createdAt)}</dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Dernière connexion</dt><dd>{a.lastSignIn ? fmtDate(a.lastSignIn) : 'Jamais'}</dd></div>
                <div><dt className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Mariage prévu</dt><dd>{a.weddingDate ? fmtDate(a.weddingDate) : '—'}</dd></div>
              </dl>
              {a.admin ? (
                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Compte administrateur : il est normal qu’il n’ait pas de mariage. Il ne peut pas être supprimé d’ici.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy !== null}
                    onClick={async () => {
                      if (await confirm({ title: 'Créer sa fiche mariage ?', item: a.email ?? a.id, tone: 'neutral', icon: HeartPlus, confirmLabel: 'Créer la fiche', message: 'La fiche est créée comme à l’inscription, avec les prénoms et la date saisis. Le couple retrouvera son espace à sa prochaine connexion et apparaîtra dans « Couples ».' })) run(`m-${a.id}`, a.id, 'create_marriage');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                    {busy === `m-${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPlus className="h-4 w-4" />} Créer sa fiche mariage
                  </button>
                  <button type="button" disabled={busy !== null}
                    onClick={async () => {
                      if (await confirm({ title: 'Supprimer ce compte ?', item: a.email ?? a.id, icon: Trash2, confirmLabel: 'Supprimer', consequences: ['Le compte de connexion et sa fiche « profiles » seront effacés.', 'La personne ne pourra plus se connecter (elle pourra se réinscrire).'] })) run(`d-${a.id}`, a.id, 'delete');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    {busy === `d-${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer le compte
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {strayProfiles.length > 0 && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
          <p className="font-semibold text-ink">Anciennes lignes « profiles » sans compte</p>
          <p className="mt-0.5 text-sm text-slate-500">Le compte de connexion n’existe plus : ces lignes ne servent à rien et peuvent être effacées.</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {strayProfiles.map((pid) => (
              <li key={pid} className="flex items-center justify-between gap-3 py-2.5">
                <code className="truncate text-xs text-slate-500">{pid}</code>
                <button type="button" disabled={busy !== null}
                  onClick={async () => { if (await confirm({ title: 'Effacer cette ligne ?', item: pid, icon: Eraser, confirmLabel: 'Effacer', message: 'Elle ne correspond à aucun compte.' })) run(`p-${pid}`, pid, 'delete_profile'); }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50">
                  {busy === `p-${pid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />} Effacer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
