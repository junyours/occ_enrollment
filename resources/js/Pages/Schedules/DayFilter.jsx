import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { DAY_OPTIONS } from './scheduleDayFilter';

export default function DayFilter({ selectedDays, onChange }) {
    const selectedOptions = DAY_OPTIONS.filter(({ value }) => selectedDays.includes(value));
    const fullLabel = selectedOptions.length === 0
        ? 'All Days'
        : selectedOptions.map(({ label }) => label).join(', ');
    const label = selectedOptions.length === 0 ? 'All Days'
        : selectedOptions.length <= 2 ? selectedOptions.map(({ label }) => label.slice(0, 3)).join(', ')
            : `${selectedOptions.length} days selected`;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const toggleDay = (day, checked) => {
        const nextDays = new Set(selectedDays);
        if (checked) nextDays.add(day);
        else nextDays.delete(day);
        onChange(DAY_OPTIONS.filter(({ value }) => nextDays.has(value)).map(({ value }) => value));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-40 shrink-0 justify-between font-normal"
                    title={fullLabel}
                    aria-label={`Filter by days: ${fullLabel}`}
                >
                    <span className="truncate">{label}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Select days</DropdownMenuLabel>
                <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onChange([]); }}>
                    <Check className={selectedDays.length === 0 ? 'size-4' : 'size-4 invisible'} aria-hidden="true" />
                    All Days
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {DAY_OPTIONS.map(({ value, label: dayLabel }) => (
                    <DropdownMenuCheckboxItem
                        key={value}
                        checked={selectedDays.includes(value)}
                        onCheckedChange={(checked) => toggleDay(value, checked)}
                        onSelect={(event) => event.preventDefault()}
                        className={value === today ? 'text-blue-600 font-semibold dark:text-blue-400' : ''}
                    >
                        {dayLabel}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
