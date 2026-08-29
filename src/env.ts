const raw: string | undefined = import.meta.env.VITE_API_URL;

// Throwing at module load is deliberate. A silent localhost fallback in a
// production build gives you an app that looks fine and fails every request.
if (!raw) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env.local.');
}

export const API_URL = raw.replace(/\/$/, '');
