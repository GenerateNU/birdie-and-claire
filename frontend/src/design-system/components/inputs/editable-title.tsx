import { Button as BaseButton } from "@base-ui/react/button";
import { Input as BaseInput } from "@base-ui/react/input";
import { NotePencilIcon } from "@phosphor-icons/react";
import { useState, type KeyboardEvent } from "react";

import { joinClasses } from "@/design-system/utils/join-classes";

type EditableTitleProps = {
  label: string;
  value: string;
  /** Gets the trimmed text. Not called for an empty or unchanged title. */
  onValueChange: (value: string) => void;
  maxLength?: number;
  className?: string;
};

/** A display-size title that turns into an input when clicked. */
export function EditableTitle({
  label,
  value,
  onValueChange,
  maxLength,
  className,
}: EditableTitleProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) {
      return;
    }

    const trimmed = draft.trim();
    setDraft(null);

    if (trimmed === "" || trimmed === value) {
      return;
    }

    onValueChange(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter while an IME is composing confirms the character, not the title.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      commit();
    }

    if (e.key === "Escape") {
      setDraft(null);
    }
  }

  if (draft !== null) {
    return (
      <BaseInput
        aria-label={label}
        value={draft}
        onValueChange={setDraft}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        autoFocus
        className={joinClasses(
          "w-full border-b border-primary bg-transparent font-serif text-display text-primary outline-none",
          className,
        )}
      />
    );
  }

  return (
    <BaseButton
      type="button"
      onClick={() => setDraft(value)}
      className={joinClasses(
        "group flex max-w-full items-center gap-lg text-left text-primary hover:text-secondary focus-ring",
        className,
      )}
    >
      <span className="min-w-0 break-words font-serif text-display">{value}</span>
      <span className="sr-only">, edit {label}</span>
      <NotePencilIcon
        size={20}
        aria-hidden="true"
        className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </BaseButton>
  );
}
