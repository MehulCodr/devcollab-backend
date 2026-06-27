"use client";

import { useState } from "react";

export default function Tabs({ tabs, defaultTab, onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  return (
    <div className="border-b border-slate-800">
      <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }
              `}
            >
              <div className="flex items-center gap-2">
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`
                    ml-2 rounded-full px-2 py-0.5 text-xs
                    ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
