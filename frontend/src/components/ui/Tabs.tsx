import { useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, defaultTabId }: { tabs: TabItem[]; defaultTabId?: string }) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label="Sections" className="flex gap-1 border-b border-ink-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeTab?.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={tab.id === activeTab?.id ? 0 : -1}
            onClick={() => setActiveId(tab.id)}
            onKeyDown={(e) => {
              const idx = tabs.findIndex((t) => t.id === tab.id);
              if (e.key === 'ArrowRight') setActiveId(tabs[(idx + 1) % tabs.length].id);
              if (e.key === 'ArrowLeft') setActiveId(tabs[(idx - 1 + tabs.length) % tabs.length].id);
            }}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab.id === activeTab?.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== activeTab?.id} className="pt-4">
          {tab.id === activeTab?.id && tab.content}
        </div>
      ))}
    </div>
  );
}
