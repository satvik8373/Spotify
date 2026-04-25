import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Search } from 'lucide-react';

import type { AdminSectionConfig, AdminSectionKey } from '../types';

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  section: AdminSectionKey;
  run?: () => void;
}

interface AdminCommandPaletteProps {
  open: boolean;
  sections: AdminSectionConfig[];
  currentSection: AdminSectionKey;
  quickActions: CommandAction[];
  onClose: () => void;
  onSelectSection: (section: AdminSectionKey) => void;
}

export const AdminCommandPalette = ({
  open,
  sections,
  currentSection,
  quickActions,
  onClose,
  onSelectSection,
}: AdminCommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return sections;
    return sections.filter((section) => (
      [section.label, section.group, section.description, ...section.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ));
  }, [normalizedQuery, sections]);

  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return quickActions;
    return quickActions.filter((action) => (
      [action.label, action.description, ...action.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ));
  }, [normalizedQuery, quickActions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/70 px-4 pb-6 pt-24 backdrop-blur-md">
      <div className="admin-command-panel w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/95 shadow-2xl shadow-cyan-950/50">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Command className="h-4 w-4 text-cyan-300" />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to modules, queues, experiments, or audit views"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300/40 hover:text-white"
          >
            Esc
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Modules
            </p>
            <div className="space-y-2">
              {filteredSections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    onSelectSection(section.key);
                    onClose();
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    currentSection === section.key
                      ? 'border-cyan-400/40 bg-cyan-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/25 hover:bg-cyan-400/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{section.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{section.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {section.group}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Quick actions
            </p>
            <div className="space-y-2">
              {filteredActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.run?.();
                    onSelectSection(action.section);
                    onClose();
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:border-emerald-300/25 hover:bg-emerald-400/5"
                >
                  <p className="text-sm font-medium text-slate-100">{action.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
