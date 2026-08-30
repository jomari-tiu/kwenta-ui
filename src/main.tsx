import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './globals.css';
import { App } from './App';
import { ENV_ERROR } from './env';
import { StartupError } from './components/StartupError';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

/**
 * A misconfigured build must not render a blank page.
 *
 * VITE_* values are inlined at BUILD time, so a missing one cannot be fixed by
 * restarting the server — the deployment has to be rebuilt. The screen says so,
 * because that is the step people miss.
 */
function bootstrap(): ReactNode {
  if (ENV_ERROR) {
    return (
      <StartupError
        title="This build has no API address"
        detail="The app was built without VITE_API_URL, so it does not know which server to talk to."
        steps={[
          'Set VITE_API_URL to your API URL in the hosting dashboard (on Vercel: Settings → Environment Variables).',
          'Apply it to Production and Preview both, or branch deploys keep failing.',
          'Redeploy. Vite bakes these values into the bundle at build time, so the existing deployment will not pick it up.',
        ]}
        technical={ENV_ERROR}
      />
    );
  }
  return <App />;
}

createRoot(rootEl).render(<StrictMode>{bootstrap()}</StrictMode>);

// React has mounted, so the static fallback in index.html can stand down.
document.documentElement.dataset.appMounted = 'true';
