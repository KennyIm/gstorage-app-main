import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import Sidebar from './Sidebar';
import { Footer } from './Footer';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}