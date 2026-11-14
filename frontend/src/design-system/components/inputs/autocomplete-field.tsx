import { Autocomplete } from "@base-ui/react/autocomplete";
import type { Icon } from "@phosphor-icons/react";
import { useRef, useState, type FocusEvent } from "react";

import {
  fieldBoxClasses,
  fieldHelperClasses,
  fieldTextClasses,
} from "@/design-system/components/inputs/field-classes";
import { Box } from "@/design-system/primitives/box";
import { joinClasses } from "@/design-system/utils/join-classes";

type AutocompleteOption = { value: string; label: string; icon?: Icon };

type AutocompleteFieldProps = {
  /** The field's accessible name. It isn't shown: put the purpose in the placeholder. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** What to suggest for the current value, already filtered, in order. */
  options: AutocompleteOption[];
  onOptionSelect: (value: string) => void;
  /** Enter pressed while no suggestion is highlighted. */
  onSubmit: () => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/** A text field that suggests values under it as you type, and still takes free text. */
export function AutocompleteField({
  label,
  value,
  onValueChange,
  options,
  onOptionSelect,
  onSubmit,
  onBlur,
  placeholder,
  error,
  disabled = false,
  autoFocus = false,
  className,
}: AutocompleteFieldProps) {
  const [open, setOpen] = useState(false);
  const highlightedRef = useRef<AutocompleteOption | undefined>(undefined);
  const state = { disabled, invalid: Boolean(error) };

  return (
    <Box className={joinClasses("flex flex-col gap-xs", className)}>
      <Autocomplete.Root
        items={options}
        value={value}
        onValueChange={onValueChange}
        // Options arrive filtered, so the list shows them as given.
        filter={null}
        itemToStringValue={(option: AutocompleteOption) => option.value}
        onItemHighlighted={(option) => {
          highlightedRef.current = option;
        }}
        // With nothing to suggest, an open popup would be an empty box.
        open={open && options.length > 0}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <Box className={`flex h-xxl items-center px-sm ${fieldBoxClasses(state)}`}>
          <Autocomplete.Input
            aria-label={label}
            aria-invalid={error ? true : undefined}
            placeholder={placeholder}
            autoFocus={autoFocus}
            onBlur={onBlur}
            onKeyDown={(event) => {
              // A highlighted suggestion handles Enter itself, through its click.
              if (event.key !== "Enter" || highlightedRef.current !== undefined) {
                return;
              }

              // Enter would otherwise submit the whole form.
              event.preventDefault();
              onSubmit();
            }}
            className={`min-w-0 flex-1 bg-transparent ${fieldTextClasses}`}
          />
        </Box>
        <Autocomplete.Portal>
          <Autocomplete.Positioner sideOffset={8} align="start" className="z-50">
            <Autocomplete.Popup className="flex w-menu flex-col border bg-card py-xxs shadow-menu">
              <Autocomplete.List>
                {(option: AutocompleteOption) => (
                  <Autocomplete.Item
                    key={option.value}
                    value={option}
                    onClick={() => onOptionSelect(option.value)}
                    className="flex h-xxl w-full cursor-default items-center gap-xs px-sm text-label-l text-primary data-[highlighted]:bg-hover"
                  >
                    {option.icon && <option.icon size={16} aria-hidden="true" />}
                    {option.label}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
      {error && <Box className={fieldHelperClasses(state)}>{error}</Box>}
    </Box>
  );
}
