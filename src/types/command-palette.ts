export interface CommandItem {
  id: string;
  label: string;
  category: "page" | "group" | "bracket" | "team";
  href: string;
  icon?: string;
}
