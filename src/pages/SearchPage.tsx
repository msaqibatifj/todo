/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTaskFlow } from "../store/stateContext";
import { Search, Inbox } from "lucide-react";
import TaskCard from "../components/TaskCard";

export default function SearchPage() {
  const { tasks, searchQuery, setSearchQuery, lists } = useTaskFlow();

  // Highlight matches
  const getFilteredSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return tasks.filter(t => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
      const matchTags = t.tags ? t.tags.some(tag => tag.toLowerCase().includes(q)) : false;
      
      const associatedList = t.list_id ? lists.find(l => l.id === t.list_id) : null;
      const matchListName = associatedList ? associatedList.name.toLowerCase().includes(q) : false;

      return matchTitle || matchNotes || matchTags || matchListName;
    });
  };

  const results = getFilteredSearch();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="font-sans">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Search Workspace</h2>
        <p className="text-xs font-bold text-[var(--text-muted)]">Search across titles, task notes, tags, and custom list names instantly.</p>
      </div>

      {/* Large Input */}
      <div className="relative font-sans">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type keywords (e.g. milestones, side project, tags)..."
          className="input-glass h-14 pl-12 pr-4 text-base"
          autoFocus
        />
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-black">
          <Search className="w-5 h-5 text-black" />
        </span>
      </div>

      {/* Display Search results */}
      {searchQuery.trim() ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-[var(--text-muted)] font-sans">
            <span>Found {results.length} matched task items</span>
            <span>Refreshed in real-time</span>
          </div>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((task, index) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  index={index} 
                  totalTasks={results.length} 
                />
              ))}
            </div>
          ) : (
            <div className="card-glass p-12 text-center max-w-md mx-auto space-y-3 mt-4 font-sans">
              <div className="w-12 h-12 border-2 border-black bg-[#facc15] flex items-center justify-center text-2xl mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                🔍
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-[var(--text-primary)]">No matches found</h3>
                <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed mt-1">
                  We couldn't locate any lists or tasks matching <strong className="underline decoration-2 decoration-red-500">"{searchQuery}"</strong>. Adjust search keyword phrases and try again.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center max-w-sm mx-auto space-y-4 mt-12 font-sans">
          <Inbox className="w-12 h-12 mx-auto text-black" />
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-wider text-[var(--text-secondary)]">Start searching...</h4>
            <p className="text-xs font-bold text-[var(--text-muted)] leading-relaxed">
              Begin typing in the bar above. Search results will match in real-time across your active and completed task archives.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
