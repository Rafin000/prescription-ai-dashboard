import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center">
      <div>
        <div className="font-serif text-[64px] font-semibold text-accent-ink mb-2 leading-none">
          404
        </div>
        <div className="text-[15px] text-ink-2 mb-5">
          The page you were looking for isn't in this clinic.
        </div>
        <Link to="/">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
