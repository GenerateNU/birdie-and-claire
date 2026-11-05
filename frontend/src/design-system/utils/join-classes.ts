export function joinClasses(ownClasses: string, className: string | undefined): string {
  return className ? `${ownClasses} ${className}` : ownClasses;
}
