import { z } from "zod";
import type { DemandValueType } from "@shared/api.interface";

export const VALUE_TYPE_OPTIONS: { value: DemandValueType; label: string }[] = [
  { value: "gmv", label: "GMV 提升" },
  { value: "efficiency", label: "工作效率提升" },
];

export const GMV_LEVEL_OPTIONS = [
  "10万以下",
  "10-50万",
  "50-100万",
  "100-500万",
  "500万以上",
];

export const EFFICIENCY_AFFECTED_OPTIONS = [
  "10人以下",
  "10-50人",
  "50-100人",
  "100-500人",
  "500人以上",
];

export const EFFICIENCY_SAVED_MINUTES_OPTIONS = [
  "5分钟以下",
  "5-15分钟",
  "15-30分钟",
  "30-60分钟",
  "60分钟以上",
];

export const DEMAND_TYPE_OPTIONS = [
  "新增功能",
  "内容调整",
  "优化功能",
  "其他",
];

export const PRIORITY_OPTIONS = [
  "P0紧急",
  "P1高",
  "P2中",
  "P3低",
];

export const BLOCKING_OPTIONS = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

export const demandFormSchema = z
  .object({
    background: z
      .string()
      .min(1, "请描述您的需求")
      .refine(
        (v) => v.replace(/<[^>]*>/g, "").trim().length > 0,
        "请描述您的需求",
      ),
    department: z.string().min(1, "请选择提出部门"),
    valueType: z.enum(["gmv", "efficiency"], {
      message: "请选择预期价值",
    }),
    gmvLevel: z.string().optional(),
    efficiencyAffected: z.string().optional(),
    efficiencySavedMinutes: z.string().optional(),
    expectedOnlineTime: z.string().min(1, "您期望上线的时间"),
    demandType: z.string().min(1, "请选择需求类型"),
    isBlocking: z.enum(["yes", "no"], { message: "请选择是否为阻塞需求" }),
    priority: z.string().min(1, "请选择需求优先级"),
  })
  .superRefine((data, ctx) => {
    if (data.valueType === "gmv" && !data.gmvLevel) {
      ctx.addIssue({
        code: "custom",
        path: ["gmvLevel"],
        message: "请选择 GMV 提升量级",
      });
    }
    if (data.valueType === "efficiency") {
      if (!data.efficiencyAffected) {
        ctx.addIssue({
          code: "custom",
          path: ["efficiencyAffected"],
          message: "请选择影响人数",
        });
      }
      if (!data.efficiencySavedMinutes) {
        ctx.addIssue({
          code: "custom",
          path: ["efficiencySavedMinutes"],
          message: "请选择人均节省时间",
        });
      }
    }
  });

export type DemandFormData = z.infer<typeof demandFormSchema>;

export function formatExpectedValue(
  valueType: DemandValueType | null,
  gmvLevel: string | null,
  efficiencyAffected: string | null,
  efficiencySavedMinutes: string | null,
): string {
  if (valueType === "gmv") {
    return `GMV 提升 · ${gmvLevel || "—"}`;
  }
  if (valueType === "efficiency") {
    const parts: string[] = [];
    if (efficiencyAffected) parts.push(`影响 ${efficiencyAffected}`);
    if (efficiencySavedMinutes) parts.push(`人均省 ${efficiencySavedMinutes}`);
    return `效率提升${parts.length > 0 ? " · " + parts.join(" · ") : ""}`;
  }
  return "—";
}
