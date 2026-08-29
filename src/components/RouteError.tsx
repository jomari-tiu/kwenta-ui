import { useNavigate, useRouteError } from 'react-router';
import { ErrorState } from '@/components/finance';
import { Button } from '@/components/ui/button';

export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message =
    error instanceof Error ? error.message : 'Something went wrong.';

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <ErrorState
        title="This page hit a problem"
        description={message}
        action={
          <Button onClick={() => void navigate('/calendar', { replace: true })}>
            Back to calendar
          </Button>
        }
      />
    </div>
  );
}
