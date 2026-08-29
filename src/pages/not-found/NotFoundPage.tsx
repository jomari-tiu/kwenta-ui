import { useNavigate } from 'react-router';
import { EmptyState } from '@/components/finance';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Page not found"
      description="That route does not exist."
      children={
        <Button onClick={() => void navigate('/calendar', { replace: true })}>
          Back to calendar
        </Button>
      }
    />
  );
}
