// Règles du mot de passe, communes à l'inscription (e-mail ou téléphone), aux Paramètres et à l'administration
export type PasswordChecks = { length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean };

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>\-_]/.test(password),
  };
}

export const passwordOk = (password: string) => Object.values(passwordChecks(password)).every(Boolean);
