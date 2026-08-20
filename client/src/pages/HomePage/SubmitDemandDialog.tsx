import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, CalendarIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TiptapEditorComplete } from "@/components/business-ui/tiptap-editor";
import { createDemand } from "@/api/demand";
import {
  BLOCKING_OPTIONS,
  DEMAND_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  demandFormSchema,
  type DemandFormData,
} from "./demand-form-config";
import { ExpectedValueFields } from "./ExpectedValueFields";

const DEFAULT_DEPARTMENT_OPTIONS = [
  "电商-平台策略与运营",
  "电商-中国电商-平台活动",
  "电商-中国电商-商家平台",
  "电商-中国电商-用户增长",
  "电商-中国电商-交易与履约",
  "电商-技术-基础架构",
  "电商-数据与算法",
  "其他",
];

interface SubmitDemandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  departments?: string[];
  onSuccess: () => void;
}

export const SubmitDemandDialog = ({
  open,
  onOpenChange,
  categoryId,
  departments,
  onSuccess,
}: SubmitDemandDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const departmentOptions =
    departments && departments.length > 0
      ? departments
      : DEFAULT_DEPARTMENT_OPTIONS;

  const form = useForm<DemandFormData>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: {
      background: "",
      department: "",
      valueType: undefined,
      gmvLevel: "",
      efficiencyAffected: "",
      efficiencySavedMinutes: "",
      expectedOnlineTime: "",
      demandType: "",
      isBlocking: undefined,
      priority: "",
    },
  });

  const valueType = form.watch("valueType");

  const resetAll = () => {
    form.reset();
  };

  const handleSubmit = async (data: DemandFormData) => {
    setSubmitting(true);
    try {
      const plainBackground = data.background.replace(/<[^>]*>/g, "").trim();
      const title = plainBackground.slice(0, 50) || "未命名需求";
      await createDemand({
        categoryId,
        title,
        background: data.background,
        department: data.department,
        image: null,
        valueType: data.valueType,
        gmvLevel: data.valueType === "gmv" ? data.gmvLevel ?? null : null,
        efficiencyAffected:
          data.valueType === "efficiency"
            ? data.efficiencyAffected ?? null
            : null,
        efficiencySavedMinutes:
          data.valueType === "efficiency"
            ? data.efficiencySavedMinutes ?? null
            : null,
        expectedOnlineTime: data.expectedOnlineTime,
        demandType: data.demandType,
        isBlocking: data.isBlocking === "yes",
        priority: data.priority,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetAll();
        onOpenChange(false);
        onSuccess();
      }, 1400);
    } catch (error) {
      logger.error("提交需求失败", error);
      toast.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) resetAll();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
          <DialogTitle className="tracking-tight">提交新需求</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">请填写以下需求信息，标有 * 为必填项</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <FormField
                control={form.control}
                name="background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      需求内容 <span className="text-destructive/70">*</span>
                    </FormLabel>
                    <FormControl>
                      <TiptapEditorComplete
                        className="w-full max-h-72"
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="描述需求的背景与现状问题..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      提出部门 <span className="text-destructive/70">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择部门" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentOptions.map((dep) => (
                          <SelectItem key={dep} value={dep}>
                            {dep}
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
                name="demandType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      需求类型 <span className="text-destructive/70">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择需求类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEMAND_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>

            <ExpectedValueFields form={form} valueType={valueType} />

            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expectedOnlineTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      预期上线时间 <span className="text-destructive/70">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start bg-transparent text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? dayjs(field.value).format("YYYY-MM-DD")
                              : "请选择日期"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(date ? date.toISOString() : "")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      需求优先级 <span className="text-destructive/70">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择优先级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4">
            <FormField
              control={form.control}
              name="isBlocking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    是否为阻塞需求 <span className="text-destructive/70">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BLOCKING_OPTIONS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
            </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-card px-6 py-3.5">
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "提交中..." : "提交需求"}
              </Button>
            </div>
          </form>
        </Form>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-card/95"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 16 }}
              >
                <CheckCircle2 className="size-14 text-success" />
              </motion.div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                需求已提交
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
