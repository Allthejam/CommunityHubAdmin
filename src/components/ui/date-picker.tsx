
"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function DatePicker({ date, setDate, disabled }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "dd/MM/yyyy") : ""
  );
  const [isInvalid, setIsInvalid] = React.useState(false);

  // When the date prop changes from outside, update the input
  React.useEffect(() => {
    if (date && isValid(date)) {
      const formatted = format(date, "dd/MM/yyyy");
      if (formatted !== inputValue) {
        setInputValue(formatted);
        setIsInvalid(false);
      }
    } else if (!date) {
        setInputValue("");
        setIsInvalid(false);
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers

    if (value.length > 2 && value.length < 5) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    } else if (value.length >= 5) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
    }

    setInputValue(value);

    if (value.length === 10) {
      const parsedDate = parse(value, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        setDate(parsedDate);
        setIsInvalid(false);
      } else {
        setIsInvalid(true);
      }
    } else {
      setIsInvalid(true);
    }
  };

  const handleBlur = () => {
    if (inputValue === "" || !isInvalid) {
        setIsInvalid(false);
        if (inputValue === "") setDate(undefined);
        return;
    };
    
    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
    if (isValid(parsedDate)) {
      setDate(parsedDate);
      setInputValue(format(parsedDate, "dd/MM/yyyy"));
      setIsInvalid(false);
    } else {
       setIsInvalid(true);
    }
  }


  return (
    <Input
      type="text"
      placeholder="dd/mm/yyyy"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(isInvalid && "border-destructive focus-visible:ring-destructive")}
      maxLength={10}
    />
  );
}

