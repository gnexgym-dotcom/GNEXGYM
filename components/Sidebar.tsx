import React from 'react';
import { GnexGymLogoIcon, DashboardIcon, MembersIcon, CheckinIcon, RecordsIcon, CoachLogIcon, DumbbellIcon, AppleIcon, ClipboardUserIcon, SettingsIcon, TasksIcon, CashIcon, HistoryIcon } from './icons/Icons';
import type { IconProps } from './icons/Icons';
import type { View } from '../types';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
}

const NavItem: React.FC<{
    view: View;
    currentView: View;
    setView: (view: View) => void;
    icon: React.FC<IconProps>;
    label: string;
}> = ({ view, currentView, setView, icon: Icon, label }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => setView(view)}
            className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-brand-red text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
        >
            <Icon className="w-6 h-6 mr-3" />
            <span className="font-semibold">{label}</span>
        </button>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
    return (
        <aside className="w-64 bg-gray-800 p-4 flex-shrink-0 flex flex-col border-r border-gray-700">
            <div className="flex items-center mb-8 px-2">
                <GnexGymLogoIcon className="w-10 h-10 text-brand-red" />
                <h1 className="text-xl font-bold text-white ml-2">GNEX<span className="text-brand-red">GYM</span></h1>
            </div>
            <nav className="flex-1 space-y-2">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</p>
                <NavItem view="dashboard" currentView={currentView} setView={setView} icon={DashboardIcon} label="Dashboard" />
                <NavItem view="members" currentView={currentView} setView={setView} icon={MembersIcon} label="Members" />
                <NavItem view="checkin" currentView={currentView} setView={setView} icon={CheckinIcon} label="Check-in Kiosk" />
                
                <p className="px-4 pt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reports</p>
                <NavItem view="records" currentView={currentView} setView={setView} icon={RecordsIcon} label="Daily Records" />
                <NavItem view="coach-log" currentView={currentView} setView={setView} icon={CoachLogIcon} label="Coach Log" />
                <NavItem view="walkin-log" currentView={currentView} setView={setView} icon={MembersIcon} label="Walk-in Log" />
                <NavItem view="taekwondo-log" currentView={currentView} setView={setView} icon={DumbbellIcon} label="Taekwondo Session Log" />
                <NavItem view="unsettled-payments" currentView={currentView} setView={setView} icon={CashIcon} label="Unsettled Payments" />
                <NavItem view="payment-history" currentView={currentView} setView={setView} icon={HistoryIcon} label="Payment History" />

                <p className="px-4 pt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Tools</p>
                <NavItem view="workout-planner" currentView={currentView} setView={setView} icon={DumbbellIcon} label="Workout Planner" />
                <NavItem view="diet-planner" currentView={currentView} setView={setView} icon={AppleIcon} label="Diet Planner" />
                
                <p className="px-4 pt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</p>
                <NavItem view="tasks" currentView={currentView} setView={setView} icon={TasksIcon} label="Tasks & Reminders" />
                <NavItem view="classes" currentView={currentView} setView={setView} icon={DumbbellIcon} label="Classes" />
                <NavItem view="coaches" currentView={currentView} setView={setView} icon={ClipboardUserIcon} label="Coaches" />
                <NavItem view="prices" currentView={currentView} setView={setView} icon={SettingsIcon} label="Price List" />
                <NavItem view="products" currentView={currentView} setView={setView} icon={DumbbellIcon} label="Products" />

            </nav>
            <div className="mt-auto text-center text-xs text-gray-500">
                <p>GNEX Gym Management</p>
                <p>&copy; 2024</p>
            </div>
        </aside>
    );
};