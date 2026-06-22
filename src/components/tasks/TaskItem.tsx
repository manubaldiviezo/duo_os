import { motion } from 'framer-motion';
import { IconCircle, IconCircleCheckFilled, IconTrash } from '@tabler/icons-react';
import { Pill } from '@/components/ui/Pill';
import { cn, formatDate, isOverdue } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types/app.types';

const PRIORITY_COLOR: Record<TaskPriority, 'red' | 'orange' | 'gray'> = {
  high: 'red',
  medium: 'orange',
  low: 'gray',
};

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const done = task.status === 'done';
  const overdue = !done && isOverdue(task.due_date);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex items-center bg-ios-red px-6 text-white">
        <IconTrash size={20} />
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) onDelete(task);
        }}
        className="relative flex items-center gap-3 bg-ios-card p-3.5"
      >
        <button onClick={() => onToggle(task)} className="shrink-0">
          {done ? (
            <IconCircleCheckFilled size={24} className="text-ios-green" />
          ) : (
            <IconCircle size={24} className="text-ios-text-3" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-medium',
              done ? 'text-ios-text-3 line-through' : 'text-ios-text'
            )}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            {task.client?.name && <span className="text-xs text-ios-text-3">{task.client.name}</span>}
            {task.due_date && (
              <span className={cn('text-xs', overdue ? 'text-ios-red' : 'text-ios-text-3')}>
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        {!done && <Pill color={PRIORITY_COLOR[task.priority]}>{task.priority}</Pill>}
      </motion.div>
    </div>
  );
}
