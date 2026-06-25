import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-ios-bg">
      <Sidebar />
      <main className="md:pl-60">
        <div className="mx-auto max-w-lg pb-[100px] md:max-w-3xl md:pb-12">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
