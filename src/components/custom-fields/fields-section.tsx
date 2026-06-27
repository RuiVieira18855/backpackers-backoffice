import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CustomFieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  options: string[];
  required: boolean;
};

type Props = {
  defs: CustomFieldDef[];
  values?: Record<string, string | number | null>;
  /** Translated section heading; if omitted the section header is hidden. */
  heading?: string;
};

/**
 * Renders a fieldset of custom fields with `cf_<key>` input names so the
 * server action's parseCustomFieldsFromFormData() picks them up.
 *
 * Pure JSX, no client state — inputs are uncontrolled with defaultValue.
 * Safe in both Server and Client component trees.
 */
export function CustomFieldsSection({ defs, values = {}, heading }: Props) {
  if (defs.length === 0) return null;

  return (
    <div className="sm:col-span-2 space-y-4 pt-4 mt-2 border-t border-border">
      {heading && (
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
      )}
      {defs.map((def) => {
        const id = `cf_${def.key}`;
        const current = values[def.key];
        const inputName = `cf_${def.key}`;
        return (
          <div key={def.key} className="space-y-2">
            <Label htmlFor={id}>
              {def.label}
              {def.required && <span className="text-destructive"> *</span>}
            </Label>
            {def.type === "textarea" ? (
              <textarea
                id={id}
                name={inputName}
                rows={3}
                required={def.required}
                defaultValue={current ? String(current) : ""}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
              />
            ) : def.type === "select" ? (
              <select
                id={id}
                name={inputName}
                defaultValue={current ? String(current) : ""}
                required={def.required}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="">—</option>
                {def.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                name={inputName}
                type={
                  def.type === "number"
                    ? "number"
                    : def.type === "date"
                      ? "date"
                      : "text"
                }
                required={def.required}
                defaultValue={current ? String(current) : ""}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
