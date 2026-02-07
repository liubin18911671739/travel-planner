'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const mergedClassNames = {
    months: 'flex flex-col sm:flex-row gap-4',
    month: 'space-y-4',
    caption: 'flex justify-center pt-1 relative items-center',
    month_caption: 'flex justify-center pt-1 relative items-center',
    caption_label: 'text-sm font-medium',
    nav: 'space-x-1 flex items-center',
    nav_button: cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    ),
    nav_button_previous: 'absolute left-1',
    nav_button_next: 'absolute right-1',
    button_previous: cn(
      buttonVariants({ variant: 'outline' }),
      'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    ),
    button_next: cn(
      buttonVariants({ variant: 'outline' }),
      'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    ),
    table: 'w-full border-collapse space-y-1',
    month_grid: 'w-full border-collapse space-y-1',
    head_row: 'flex',
    weekdays: 'flex',
    head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
    weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
    row: 'flex w-full mt-2',
    week: 'flex w-full mt-2',
    cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
    day: 'h-9 w-9 p-0 text-center text-sm relative [&:has([aria-selected].range_end)]:rounded-r-md [&:has([aria-selected].outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
    day_button: cn(
      buttonVariants({ variant: 'ghost' }),
      'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
    ),
    selected:
      'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
    day_selected:
      'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
    today: 'bg-accent text-accent-foreground',
    day_today: 'bg-accent text-accent-foreground',
    outside:
      'outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
    day_outside:
      'outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
    disabled: 'text-muted-foreground opacity-50',
    day_disabled: 'text-muted-foreground opacity-50',
    range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
    day_range_middle:
      'aria-selected:bg-accent aria-selected:text-accent-foreground',
    range_end: 'range_end',
    day_range_end: 'range_end',
    hidden: 'invisible',
    day_hidden: 'invisible',
    ...(classNames as Record<string, string>),
  } as CalendarProps['classNames']

  const mergedComponents = {
    Chevron: ({
      orientation,
      className: chevronClassName,
      ...chevronProps
    }: React.SVGProps<SVGSVGElement> & { orientation?: 'left' | 'right' }) =>
      orientation === 'left' ? (
        <ChevronLeft className={cn('h-4 w-4', chevronClassName)} {...chevronProps} />
      ) : (
        <ChevronRight className={cn('h-4 w-4', chevronClassName)} {...chevronProps} />
      ),
    IconLeft: ({
      className: iconClassName,
      ...iconProps
    }: React.ComponentProps<typeof ChevronLeft>) => (
      <ChevronLeft className={cn('h-4 w-4', iconClassName)} {...iconProps} />
    ),
    IconRight: ({
      className: iconClassName,
      ...iconProps
    }: React.ComponentProps<typeof ChevronRight>) => (
      <ChevronRight className={cn('h-4 w-4', iconClassName)} {...iconProps} />
    ),
  } as CalendarProps['components']

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
