/**
 * Theme picker for the command bar. Two named themes, each a complete system —
 * not a light/dark toggle of one palette.
 */

import { Select } from '@base-ui-components/react/select';
import { THEMES, useTheme, type ThemeId } from '../../context/ThemeContext';

const items = THEMES.map((t) => ({ value: t.id, label: t.label, note: t.note }));

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Select.Root
      items={items.map(({ value, label }) => ({ value, label }))}
      value={theme}
      onValueChange={(v) => {
        if (typeof v === 'string') setTheme(v as ThemeId);
      }}
    >
      <Select.Trigger
        className="inline-flex items-center gap-2 rounded-pill border border-rule bg-paper px-3 py-1.5 text-sm text-ink-2 outline-none transition-colors hover:bg-paper-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
        aria-label="Theme"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
          aria-hidden="true"
        />
        <Select.Value>{(label: string | null) => label ?? 'theme'}</Select.Value>
        <Select.Icon className="text-ink-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="end" className="z-50">
          <Select.Popup className="min-w-[14rem] rounded-card bg-paper p-1.5 shadow-pop ring-1 ring-rule outline-none">
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-pill px-3 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-ink"
              >
                <span className="flex flex-col">
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <span className="font-mono text-xs opacity-70">{item.note}</span>
                </span>
                <Select.ItemIndicator>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
