'use client';
import {Select} from '@heroui/react/select';
import {ListBox} from '@heroui/react/list-box';
import {Label} from '@heroui/react/label';
type Option={value:string;label:string;lang?:string};
export function EditorialSelect({label,value,options,onChange,disabled=false,className='',showLabel=false}:{label:string;value:string;options:Option[];onChange:(value:string)=>void;disabled?:boolean;className?:string;showLabel?:boolean}){
 return <Select aria-label={label} value={value} onChange={next=>{if(typeof next==='string'&&options.some(item=>item.value===next))onChange(next)}} isDisabled={disabled} className={'editorial-select '+className} variant="secondary">{showLabel&&<Label>{label}</Label>}<Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger><Select.Popover placement="bottom start"><ListBox aria-label={label}>{options.map(option=><ListBox.Item key={option.value} id={option.value} textValue={option.label}><Label lang={option.lang}>{option.label}</Label><ListBox.ItemIndicator/></ListBox.Item>)}</ListBox></Select.Popover></Select>;
}
