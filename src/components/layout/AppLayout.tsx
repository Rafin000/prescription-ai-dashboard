import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MemberWelcomeBanner } from '../team/MemberWelcomeBanner';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-w-0 px-5 lg:px-8 py-6 lg:py-8 flex flex-col gap-5">
          <MemberWelcomeBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
