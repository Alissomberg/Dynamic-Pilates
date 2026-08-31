import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, DollarSign } from 'lucide-react';
import clsx from 'clsx';

export function BottomNav({ activeTab, onTabChange, alertasCount = 0 }) {
  const tabs = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'presenca', label: 'Presença', icon: CalendarCheck },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, badge: alertasCount }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="max-w-xl mx-auto px-2 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                "relative flex flex-col items-center justify-center py-1.5 px-4 rounded-xl min-w-[72px] min-h-[54px] transition-all touch-press",
                isActive 
                  ? "text-pilates-600 font-bold bg-pilates-50/80" 
                  : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <div className="relative">
                <Icon className={clsx("w-6 h-6 transition-transform", isActive && "scale-110 text-pilates-600")} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
