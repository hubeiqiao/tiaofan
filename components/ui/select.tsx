'use client';
import {Children,isValidElement,useCallback,useMemo,useRef,useState,type ReactNode} from 'react';
import {Select as HeroSelect} from '@heroui/react/select';
import {ListBox} from '@heroui/react/list-box';
import {Label} from '@heroui/react/label';
import {UNSAFE_PortalProvider,useUNSAFE_PortalContext} from 'react-aria/PortalProvider';
import {mergeRefs} from 'react-aria/mergeRefs';
import {PopoverContext} from 'react-aria-components/Popover';
import {useSlottedContext} from 'react-aria-components/slots';
function optionText(node:ReactNode):string{return Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<{children?:ReactNode}>(child)?optionText(child.props.children):'').join('')}
/** Compatibility boundary: preserve application selection state while using HeroUI controls. */
export function Select({value,defaultValue,onValueChange,children,disabled,open,onOpenChange}:{value?:string;defaultValue?:string;onValueChange?:(value:string)=>void;children:ReactNode;disabled?:boolean;open?:boolean;onOpenChange?:(open:boolean)=>void}){
  const [root,setRoot]=useState<HTMLDivElement|null>(null);
  const inheritedPortal=useUNSAFE_PortalContext();
  // A body portal is outside Radix's modal pointer/focus boundary. Use React
  // Aria's public provider, resolving the actual owning dialog for each Select.
  const getContainer=()=>{
    // Wait for the root ref even for an initially open Select, so a dialog's
    // menu never briefly mounts into an inaccessible body portal.
    if(!root)return null;
    const dialog=root.closest<HTMLElement>('[data-slot="dialog-content"]');
    if(dialog)return dialog;
    if(inheritedPortal.getContainer)return inheritedPortal.getContainer();
    return root.ownerDocument.body;
  };
  const trigger=Children.toArray(children).find(child=>isValidElement(child)&&child.type===SelectTrigger);
  const label=isValidElement(trigger)?(trigger.props as Record<string,unknown>)['aria-label']:undefined;
  return <UNSAFE_PortalProvider getContainer={getContainer}><HeroSelect ref={setRoot} aria-label={typeof label==='string'?label:undefined} value={value} defaultValue={defaultValue} onChange={next=>{if(typeof next==='string')onValueChange?.(next)}} isDisabled={disabled} isOpen={open} onOpenChange={onOpenChange} className="editorial-select" variant="secondary">{children}</HeroSelect></UNSAFE_PortalProvider>
}
export function SelectTrigger({children,className='',size, ...props}:Omit<React.ComponentProps<typeof HeroSelect.Trigger>,'children'>&{children?:ReactNode;size?:'sm'|'default'}){return <HeroSelect.Trigger data-slot="select-trigger" data-size={size} className={className} {...props}>{children}<HeroSelect.Indicator/></HeroSelect.Trigger>}
export function SelectValue(props:React.ComponentProps<typeof HeroSelect.Value>){return <HeroSelect.Value data-slot="select-value" {...props}/>}
export function SelectContent({children,className='',position,align,ref:forwardedRef,...props}:{children:ReactNode;className?:string;position?:string;align?:string;ref?:React.Ref<HTMLElement>}){
  const {getContainer}=useUNSAFE_PortalContext();
  const container=getContainer?.();
  const {triggerRef}=useSlottedContext(PopoverContext)??{};
  const popupRef=useRef<HTMLElement|null>(null);
  const observePopup=useCallback((node:HTMLElement|null)=>{
    const previous=popupRef.current;
    popupRef.current=node;
    if(node||!previous)return;
    const trigger=triggerRef?.current as HTMLElement|null|undefined;
    const dialog=trigger?.closest<HTMLElement>('[data-slot="dialog-content"]');
    if(!trigger||!dialog||dialog.getAttribute('data-state')!=='open')return;
    const document=previous.ownerDocument;
    // Radix's removal observer can focus the dialog before React Aria's own
    // restore frame (which only restores from body). Repair only that fallback,
    // after the popup really detaches, including its exit animation.
    document.defaultView?.requestAnimationFrame(()=>{
      if(popupRef.current||!dialog.isConnected||!trigger.isConnected||
        dialog.getAttribute('data-state')!=='open'||
        trigger.getAttribute('aria-expanded')==='true'||
        trigger.closest('[data-slot="dialog-content"]')!==dialog||
        document.activeElement!==dialog)return;
      trigger.focus({preventScroll:true});
    });
  },[triggerRef]);
  const ref=useMemo(()=>mergeRefs(forwardedRef,observePopup),[forwardedRef,observePopup]);
  // Task dialogs may clip overflow. Let React Aria flip/size the menu against
  // that same surface rather than positioning it beyond the clipped boundary.
  const boundaryElement=container?.matches('[data-slot="dialog-content"]')?container:undefined;
  return <HeroSelect.Popover className={className} placement="bottom start" boundaryElement={boundaryElement} data-slot="select-content" {...props} ref={ref}><ListBox>{children}</ListBox></HeroSelect.Popover>
}
export function SelectItem({children,value,disabled,className=''}:{children:ReactNode;value:string;disabled?:boolean;className?:string}){return <ListBox.Item id={value} textValue={optionText(children)||value} isDisabled={disabled} className={className} data-slot="select-item"><Label>{children}</Label><ListBox.ItemIndicator/></ListBox.Item>}
export function SelectGroup({children}:{children:ReactNode}){return <ListBox.Section>{children}</ListBox.Section>}
export function SelectLabel({children}:{children:ReactNode}){return <Label>{children}</Label>}
export function SelectSeparator(){return <hr/>}
export function SelectScrollUpButton(){return null}
export function SelectScrollDownButton(){return null}
