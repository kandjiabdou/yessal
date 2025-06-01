
import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar />
      <main className="flex-1 overflow-y-auto px-4 pb-16 pt-2">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
