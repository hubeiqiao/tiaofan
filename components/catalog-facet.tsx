'use client';

import {RadioGroup} from '@heroui/react/radio-group';
import {Radio} from '@heroui/react/radio';
import {Label} from '@heroui/react/label';

type FacetOption = {value: string; label: string; accessibleLabel?: string};
type CatalogFacetProps = {
  label: string;
  accessibleLabel?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FacetOption[];
  disabled?: boolean;
  className?: string;
};

/** Keep compact visible text in an expanded name, including numeric thresholds. */
function accessibleName(label: string, expanded?: string) {
  const name = expanded?.trim();
  return !name ? label : name.includes(label) ? name : `${label} · ${name}`;
}

/** Direct, controlled criteria. HeroUI owns radio, arrow-key, and Tab behavior. */
export function CatalogFacet({label, accessibleLabel, value, onValueChange, options, disabled, className}: CatalogFacetProps) {
  return (
    <RadioGroup
      className={['catalog-facet', className].filter(Boolean).join(' ')}
      aria-label={accessibleName(label, accessibleLabel)}
      value={value}
      onChange={onValueChange}
      isDisabled={disabled}
      orientation="horizontal"
    >
      {/* A plain span avoids a second LabelContext name on the group. */}
      <span className="catalog-facet-label" aria-hidden="true">{label}</span>
      <div className="catalog-facet-options">
        {options.map(option => (
          <Radio
            key={option.value}
            className="catalog-facet-option"
            value={option.value}
            aria-label={option.accessibleLabel ? accessibleName(option.label, option.accessibleLabel) : undefined}
          >
            <Radio.Content className="catalog-facet-choice">
              <Label>{option.label}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
