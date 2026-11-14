import type { CurrentUserResponse } from "@/api/generated/types.gen";

// The account has one free-text name, so its first word stands in for a first name. A blank name
// gives "".
export function firstName(user: CurrentUserResponse): string {
  return user.name.trim().split(/\s+/)[0];
}
