/**
 * Preset-server picker built on base-ui's accessible Select. Selecting a preset
 * connects immediately. Uses transition-colors (not `transition`) so the focus
 * ring appears instantly rather than animating in.
 */

import { Select } from '@base-ui-components/react/select';
import { PRESET_SERVERS } from '../../context/ServerContext';

const items = PRESET_SERVERS.map((s) => ({ value: s.url, label: s.label }));

export function PresetSelect({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (url: string) => void;
}) {
  const selected = items.some((i) => i.value === value) ? value : null;

  return (
    <Select.Root
      items={items}
      value={selected}
      onValueChange={(v) => {
        if (typeof v === 'string') onSelect(v);
      }}
    >
      <Select.Trigger className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-rule bg-paper px-3 py-1.5 font-mono text-sm text-ink-2 outline-none transition-colors hover:bg-paper-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus">
        <Select.Value>{(label: string | null) => label ?? 'presets'}</Select.Value>
        <Select.Icon className="text-ink-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} className="z-50">
          <Select.Popup className="min-w-[13rem] rounded-card bg-paper p-1.5 shadow-pop ring-[1.5px] ring-rule outline-none">
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-pill px-3 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-accent data-[highlighted]:font-semibold data-[highlighted]:text-accent-ink"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
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
