import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EFFICIENCY_AFFECTED_OPTIONS,
  EFFICIENCY_SAVED_MINUTES_OPTIONS,
  GMV_LEVEL_OPTIONS,
  VALUE_TYPE_OPTIONS,
  type DemandFormData,
} from "./demand-form-config";

interface ExpectedValueFieldsProps {
  form: UseFormReturn<DemandFormData>;
  valueType: DemandFormData["valueType"] | undefined;
}

export const ExpectedValueFields = ({
  form,
  valueType,
}: ExpectedValueFieldsProps) => {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <FormField
        control={form.control}
        name="valueType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              预期价值 <span className="text-destructive/70">*</span>
            </FormLabel>
            <Select
              onValueChange={(v) => {
                field.onChange(v);
                form.setValue("gmvLevel", "");
                form.setValue("efficiencyAffected", "");
                form.setValue("efficiencySavedMinutes", "");
              }}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="请选择预期价值类型" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {VALUE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {valueType === "gmv" && (
        <div className="mt-3">
          <FormField
            control={form.control}
            name="gmvLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  预期 GMV 提升量级{" "}
                  <span className="text-destructive/70">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择 GMV 量级" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GMV_LEVEL_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {valueType === "efficiency" && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="efficiencyAffected"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  影响人数 <span className="text-destructive/70">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择影响人数" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EFFICIENCY_AFFECTED_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="efficiencySavedMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  人均节省时间 <span className="text-destructive/70">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择节省时间" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EFFICIENCY_SAVED_MINUTES_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
};
