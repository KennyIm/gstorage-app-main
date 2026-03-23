import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer'; 

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50"> 
      <Navbar />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <Outlet />
      </main>
      <Footer /> 
      
    </div>
  );
}