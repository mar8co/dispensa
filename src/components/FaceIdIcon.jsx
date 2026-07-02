// Icona Face ID (stile Apple): quattro angoli, occhi a trattino, naso con
// gancio e sorriso. Disegnata a mano perché nessuna icona lucide corrisponde
// esattamente. Usa `currentColor`, quindi eredita colore e dimensione dal
// contenitore (className con text-* e h-*/w-*).
export default function FaceIdIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Angoli del mirino */}
      <path d="M8 4H6a2 2 0 0 0-2 2v2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
      {/* Occhi */}
      <path d="M9 9v2" />
      <path d="M15 9v2" />
      {/* Naso (linea con gancio a sinistra) */}
      <path d="M12 9v3.2a1 1 0 0 1-1 1" />
      {/* Bocca (sorriso) */}
      <path d="M9.5 15.4c.7.9 1.6 1.4 2.5 1.4s1.8-.5 2.5-1.4" />
    </svg>
  );
}
