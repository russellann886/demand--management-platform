import React from 'react';
import { Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Spinner } from '@/components/ui/spinner';

import type { UnifiedRow } from './unified-rows';
import type { FormFieldDefinition } from '@shared/api.interface';
import { getPercentileLevels, type ScoreLevel } from './demand-scoring';
import DemandCard from './DemandCard';

interface UnifiedDemandTableProps {
  rows: UnifiedRow[];
  loading: boolean;
  selectionMode: boolean;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  onDeleteMerged: (id: string) => void;
  onReleaseSource: (mergedDemandId: string, demandId: string) => void;
  onAddSource: (mergedDemandId: string, mergedTitle: string) => void;
  onRefresh?: () => void;
  formFields?: FormFieldDefinition[] | null;
}

const UnifiedDemandTable: React.FC<UnifiedDemandTableProps> = ({
  rows,
  loading,
  selectionMode,
  selectedKeys,
  onSelectedKeysChange,
  onDeleteMerged,
  onReleaseSource,
  onAddSource,
  onRefresh,
  formFields,
}) => {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
    new Set(),
  );

  const levelMap = React.useMemo(() => {
    const levels = getPercentileLevels(rows.length);
    const map = new Map<string, ScoreLevel>();
    rows.forEach((row, index) => {
      map.set(row.key, levels[index] ?? 'low');
    });
    return map;
  }, [rows]);

  const handleExpandToggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleSelect = (key: string) => {
    const isSelected = selectedKeys.includes(key);
    onSelectedKeysChange(
      isSelected
        ? selectedKeys.filter((k) => k !== key)
        : [...selectedKeys, key],
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Inbox className="size-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          暂无需求数据
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((record) => (
          <motion.div
            key={record.key}
            layout="position"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <DemandCard
              record={record}
              level={levelMap.get(record.key) ?? 'low'}
              selectionMode={selectionMode}
              isSelected={selectedKeys.includes(record.key)}
              onToggleSelect={() => handleToggleSelect(record.key)}
              expanded={expandedKeys.has(record.key)}
              onExpandToggle={() => handleExpandToggle(record.key)}
              onDeleteMerged={onDeleteMerged}
              onReleaseSource={onReleaseSource}
              onAddSource={onAddSource}
              onRefresh={onRefresh}
              formFields={formFields}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedDemandTable;
