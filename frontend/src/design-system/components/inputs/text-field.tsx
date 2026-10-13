import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";

const inputClasses =
  "rounded-sm border bg-background px-sm py-xs text-body focus-ring data-[disabled]:opacity-50";

type TextFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "className"> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function TextField({
  label,
  value,
  onValueChange,
  className,
  ...inputProps
}: TextFieldProps) {
  const labelClasses = "flex flex-col gap-xxs text-body";

  return (
    <label className={className ? `${labelClasses} ${className}` : labelClasses}>
      {label}
      <BaseInput
        {...inputProps}
        value={value}
        onValueChange={onValueChange}
        className={inputClasses}
      />
    </label>
  );
}
