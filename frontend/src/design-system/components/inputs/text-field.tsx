import { Input as BaseInput } from "@base-ui/react/input";

type TextFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  type?: "text" | "email" | "password" | "search" | "tel" | "url";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function TextField({
  label,
  value,
  onValueChange,
  type = "text",
  placeholder,
  disabled = false,
  className,
}: TextFieldProps) {
  return (
    <label className={className}>
      {label}
      <BaseInput
        type={type}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}
