'use client';

import { Plus, LogIn } from 'lucide-react';
import { Workspace } from '@/types';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onJoinWorkspace: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  onJoinWorkspace,
}: WorkspaceSwitcherProps) {
  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center border-r border-gray-200 bg-slate-100 py-3 text-gray-700">
      <div
        title="RuangKolaborasi"
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-[3px]">
          <div className="h-[8px] w-[8px] rounded-[2px] bg-white opacity-95" />
          <div className="h-[8px] w-[8px] rounded-[2px] bg-white opacity-70" />
          <div className="h-[8px] w-[8px] rounded-[2px] bg-white opacity-70" />
          <div className="h-[8px] w-[8px] rounded-[2px] bg-white opacity-35" />
        </div>
      </div>

      <div className="mb-3 h-px w-10 bg-slate-200" />

      <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;

          return (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onWorkspaceChange(workspace.id)}
              title={workspace.name}
              className="group relative flex h-12 w-12 items-center justify-center"
            >
              <span
                className={`absolute -left-3 w-1 rounded-full bg-blue-600 transition-all ${
                  isActive ? 'h-8' : 'h-0 group-hover:h-5'
                }`}
              />
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-all ${
                  isActive
                    ? 'scale-100 bg-blue-600 text-white ring-2 ring-blue-300/50'
                    : `scale-95 border border-slate-200 ${workspace.color} text-white opacity-80 group-hover:scale-100 group-hover:opacity-100`
                }`}
              >
                {workspace.shortName}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col items-center gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={onCreateWorkspace}
          title="Buat grup baru"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-600 transition-colors hover:border-emerald-100 hover:bg-emerald-50"
        >
          <Plus size={20} />
        </button>
        <button
          type="button"
          onClick={onJoinWorkspace}
          title="Join grup"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 transition-colors hover:border-blue-100 hover:bg-blue-50"
        >
          <LogIn size={19} />
        </button>
      </div>
    </aside>
  );
}
