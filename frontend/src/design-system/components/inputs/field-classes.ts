type FieldState = {
  disabled: boolean;
  invalid: boolean;
};

export const fieldLabelClasses = "text-label-l text-primary data-[disabled]:text-disabled";

export const fieldTextClasses =
  "text-body-m text-primary outline-none placeholder:text-secondary disabled:text-disabled disabled:placeholder:text-disabled";

// Focus shows as a heavier ink border instead of the focus ring, as in Figma. An invalid field
// keeps its error border while focused.
export function fieldBoxClasses({ disabled, invalid }: FieldState) {
  if (disabled) {
    return "border bg-disabled";
  }

  if (invalid) {
    return "border-medium border-error bg-card";
  }

  return "border border-control bg-card focus-within:border-medium focus-within:border-primary";
}

export function fieldHelperClasses({ disabled, invalid }: FieldState) {
  if (disabled) {
    return "text-body-s text-disabled";
  }

  return invalid ? "text-body-s text-error" : "text-body-s text-secondary";
}
