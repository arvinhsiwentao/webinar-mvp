'use client';

import { ReactNode } from 'react';

interface ArrayFieldEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    update: (field: keyof T, value: T[keyof T]) => void,
    remove: () => void,
  ) => ReactNode;
  emptyLabel?: string;
}

export default function ArrayFieldEditor<T>({
  items,
  onChange,
  renderItem,
  emptyLabel,
}: ArrayFieldEditorProps<T>) {
  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof T, value: T[keyof T]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <>
      {emptyLabel && items.length === 0 && (
        <p className="text-neutral-400 text-sm">{emptyLabel}</p>
      )}
      {items.map((item, idx) => (
        <div key={idx}>
          {renderItem(
            item,
            idx,
            (field, value) => handleUpdate(idx, field, value),
            () => handleRemove(idx),
          )}
        </div>
      ))}
    </>
  );
}

export { type ArrayFieldEditorProps };
