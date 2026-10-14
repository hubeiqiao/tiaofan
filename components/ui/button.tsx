'use client';
import {Button as HeroButton} from '@heroui/react/button';
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva("editorial-button", {
 variants: {variant:{default:"action-primary",destructive:"action-destructive",outline:"action-secondary",secondary:"action-secondary",ghost:"action-quiet",link:"action-link"},size:{default:"",xs:"action-small",sm:"action-small",lg:"action-large",icon:"icon-control","icon-xs":"icon-control","icon-sm":"icon-control","icon-lg":"icon-control"}},
 defaultVariants:{variant:"default",size:"default"}
})

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  value,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  if(asChild)return <Slot.Root {...{disabled,value}} data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({variant,size,className}))} {...props}/>;
  const mappedVariant=variant==='default'?'primary':variant==='destructive'?'danger':variant==='link'?'ghost':variant||'primary';
  const mappedSize=size==='lg'||size==='icon-lg'?'lg':size==='sm'||size==='xs'||size==='icon-sm'||size==='icon-xs'?'sm':'md';
  // HeroUI still renders an HTMLButtonElement; adapt the wider React Aria event typings at this boundary.
  const heroProps={...props,onClick:props.onClick as React.ComponentProps<typeof HeroButton>['onClick'],onFocus:props.onFocus as React.ComponentProps<typeof HeroButton>['onFocus'],onBlur:props.onBlur as React.ComponentProps<typeof HeroButton>['onBlur'],onKeyDown:props.onKeyDown as React.ComponentProps<typeof HeroButton>['onKeyDown'],onKeyUp:props.onKeyUp as React.ComponentProps<typeof HeroButton>['onKeyUp']};
  return <HeroButton data-slot="button" data-variant={variant} data-size={size} variant={mappedVariant} size={mappedSize} isIconOnly={size?.startsWith('icon')} isDisabled={disabled} value={value==null?undefined:String(value)} className={cn('editorial-button',className)} {...heroProps}/>;

}

export { Button, buttonVariants }
