import { Providers } from './app/Providers';
import { AppRoutes } from './app/AppRoutes';

export function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
