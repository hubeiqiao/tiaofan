'use client';
import {RadioGroup} from '@heroui/react/radio-group';
import {Radio} from '@heroui/react/radio';
import {Label} from '@heroui/react/label';
import {LayoutGrid, List} from 'lucide-react';
import {isCatalogLayout, type CatalogLayout} from '@/lib/catalog-layout';

type CatalogLayoutToggleProps = {
  locale: 'zh' | 'en' | 'ja';
  value?: CatalogLayout;
  onChange: (layout: CatalogLayout) => void;
  /** Capture reading position before native keyboard focus moves between radios. */
  onBeforeChange?: () => void;
  className?: string;
};
const copy = {
  zh: {label: '动画显示方式', grid: '平铺', list: '列表', gridLabel: '平铺显示动画', listLabel: '列表显示动画'},
  en: {label: 'Anime layout', grid: 'Grid', list: 'List', gridLabel: 'Grid view', listLabel: 'List view'},
  ja: {label: 'アニメの表示形式', grid: 'グリッド', list: 'リスト', gridLabel: 'グリッド表示', listLabel: 'リスト表示'},
};
export function CatalogLayoutToggle({locale, value, onChange, onBeforeChange, className = ''}: CatalogLayoutToggleProps) {
  const labels = copy[locale];
  return <div
    className={`catalog-layout-toggle ${className}`.trim()}
    onPointerDownCapture={() => { if (value) onBeforeChange?.(); }}
    onKeyDownCapture={event => {
      if (value && !event.altKey && !event.ctrlKey && !event.metaKey && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' '].includes(event.key)) onBeforeChange?.();
    }}
  ><RadioGroup
    aria-label={labels.label}
    orientation="horizontal"
    value={value ?? ''}
    isDisabled={!value}
    onChange={next => { if (isCatalogLayout(next)) onChange(next); }}
    className="catalog-layout-radios"
    style={{display: 'inline-flex', flexDirection: 'row', gap: 2}}
  >
    {([{value: 'grid', Icon: LayoutGrid}, {value: 'list', Icon: List}] as const).map(option => <Radio
      key={option.value}
      value={option.value}
      aria-label={option.value === 'grid' ? labels.gridLabel : labels.listLabel}
      className="catalog-layout-option"
    >
      <Radio.Content className="catalog-layout-button">
        <option.Icon size={16} aria-hidden="true"/>
        <Label>{labels[option.value]}</Label>
      </Radio.Content>
    </Radio>)}
  </RadioGroup></div>;
}
