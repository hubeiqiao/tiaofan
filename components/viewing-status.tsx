'use client';
import {RadioGroup} from '@heroui/react/radio-group';
import {Radio} from '@heroui/react/radio';
import {Label} from '@heroui/react/label';
/** In-place optional status avoids a second overlay inside the detail dialog. */
export function ViewingStatus({label,value,onChange,disabled,options}:{label:string;value:string;onChange:(value:string)=>void;disabled:boolean;options:Record<string,string>}){
 return <RadioGroup className="viewing-status-options" aria-label={label} value={value} onChange={onChange} isDisabled={disabled} orientation="horizontal">{Object.entries(options).map(([key,text])=><Radio key={key} value={key}><Radio.Content><Radio.Control><Radio.Indicator/></Radio.Control><Label>{text}</Label></Radio.Content></Radio>)}</RadioGroup>;
}
