"use client";

import AppShell from "@/components/AppShell";
import KanbanColumn from "@/components/ui/KanbanColumn";
import { Plus, Filter, Search } from "lucide-react";

export default function TasksPage() {
  const mockTasks = [
    {
      id: "tsk_1",
      title: "Design new landing page concepts",
      priority: "High",
      assignee: "Sarah Jenkins",
      dueDate: "Tomorrow",
      status: "todo",
    },
    {
      id: "tsk_2",
      title: "Update API documentation for v2",
      priority: "Medium",
      assignee: "You",
      dueDate: "Oct 12",
      status: "todo",
    },
    {
      id: "tsk_3",
      title: "Implement OAuth2 login flow",
      priority: "High",
      assignee: "You",
      dueDate: "Today",
      status: "in_progress",
      overdue: true,
    },
    {
      id: "tsk_4",
      title: "Fix responsive layout on dashboard",
      priority: "Medium",
      assignee: "Marcus Doe",
      dueDate: "Oct 15",
      status: "in_progress",
    },
    {
      id: "tsk_5",
      title: "Code review: Project sharing feature",
      priority: "Low",
      assignee: "You",
      dueDate: "Yesterday",
      status: "review",
      overdue: true,
    },
    {
      id: "tsk_6",
      title: "Set up CI/CD pipeline",
      priority: "High",
      assignee: "Alex Chen",
      dueDate: "Oct 10",
      status: "done",
      completed: true,
    },
    {
      id: "tsk_7",
      title: "Migrate database to PostgreSQL",
      priority: "Medium",
      assignee: "You",
      dueDate: "Oct 5",
      status: "done",
      completed: true,
    },
  ];

  const getTasksByStatus = (status) => mockTasks.filter(task => task.status === status);

  return (
    <AppShell
      title="Tasks Board"
      description="Track and manage all your tasks across projects in one place."
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="bg-transparent border-none outline-none text-sm text-white w-48"
            />
          </div>
          
          <button className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      }
    >
      <div className="flex gap-6 overflow-x-auto pb-8 pt-2 min-h-[calc(100vh-200px)]">
        <KanbanColumn 
          title="To Do" 
          count={getTasksByStatus("todo").length}
          color="slate"
          tasks={getTasksByStatus("todo")}
        />
        
        <KanbanColumn 
          title="In Progress" 
          count={getTasksByStatus("in_progress").length}
          color="blue"
          tasks={getTasksByStatus("in_progress")}
        />
        
        <KanbanColumn 
          title="In Review" 
          count={getTasksByStatus("review").length}
          color="amber"
          tasks={getTasksByStatus("review")}
        />
        
        <KanbanColumn 
          title="Done" 
          count={getTasksByStatus("done").length}
          color="green"
          tasks={getTasksByStatus("done")}
        />
      </div>
    </AppShell>
  );
}
