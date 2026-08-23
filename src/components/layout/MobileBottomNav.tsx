import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, ShieldAlert, Menu } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
  earlyWarningCount?: number;
  studentCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  earlyWarningCount = 0,
  studentCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'students' as ActiveTab,
      label: 'Siswa',
      icon: Users,
      badge: studentCount > 0 ? studentCount : undefined,
    },
    {
      id: 'attendance' as ActiveTab,
      label: 'Presensi',
      icon: CalendarCheck,
    },
    {
      id: 'discipline' as ActiveTab,
      label: 'Disiplin',
      icon: ShieldAlert,
      badge: earlyWarningCount > 0 ? earlyWarningCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-2 py-1 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            id={`btn-bottom-nav-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-h-[48px] min-w-[56px] relative cursor-pointer ${
              isActive ? 'text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-zinc-500'}`} />
              {item.badge !== undefined && (
                <span
                  className={`absolute -top-1.5 -right-2 px-1 py-0.2 text-[9px] font-bold rounded-full ${
                    item.badgeColor || 'bg-blue-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / All features button */}
      <button
        id="btn-bottom-nav-more"
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-zinc-500 hover:text-zinc-900 transition min-h-[48px] min-w-[56px] cursor-pointer"
      >
        <Menu className="w-5 h-5 text-zinc-600" />
        <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
      </button>
    </div>
  );
};
