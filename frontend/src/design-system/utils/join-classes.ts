/** Appends a caller's `className` to a component's own classes. */
export function joinClasses(ownClasses: string, className: string | undefined): string {
  return className ? `${ownClasses} ${className}` : ownClasses;
}
