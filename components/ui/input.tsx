"use client";
import * as React from "react";
import {Input as HeroInput} from '@heroui/react/input';
import {cn} from '@/lib/utils';
function Input({className,...props}:React.ComponentProps<'input'>){return <HeroInput data-slot="input" className={cn('editorial-input',className)} {...props}/>}
export {Input};
