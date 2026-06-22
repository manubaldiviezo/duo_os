import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-ios-bg">
      <main className="mx-auto max-w-lg pb-[100px]">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
