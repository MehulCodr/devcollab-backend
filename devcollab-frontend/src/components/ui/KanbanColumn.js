import Card from "./Card";
import Badge from "./Badge";
import { MoreHorizontal, Clock, User, CheckCircle2 } from "lucide-react";

export default function KanbanColumn({ title, count, color, tasks = [] }) {
  const getBadgeColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'amber';
      case 'low': return 'blue';
      default: return 'slate';
    }
  };

  return (
    <div className="flex flex-col bg-slate-900/50 rounded-xl p-4 min-w-[320px] max-w-[320px] border border-slate-800">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full bg-${color}-500`} />
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full font-medium ml-1">
            {count}
          </span>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
            No tasks
          </div>
        ) : (
          tasks.map(task => (
            <Card key={task.id} className="p-4 cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm bg-slate-950">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={getBadgeColor(task.priority)} className="text-[10px] px-1.5 py-0">
                  {task.priority}
                </Badge>
                {task.completed && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              
              <h4 className="font-medium text-slate-200 text-sm mb-3 leading-snug">
                {task.title}
              </h4>
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="truncate max-w-[100px]">{task.assignee}</span>
                </div>
                
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${task.overdue ? 'text-red-400' : ''}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.dueDate}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
