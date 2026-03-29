import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JsonView } from "@/components/ui/json-view";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBanner } from "@/components/ui/status-banner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { splitCsv } from "@/lib/utils";

type FieldOption = {
  label: string;
  value: string;
};

export type ActionField = {
  key: string;
  label: string;
  kind: "text" | "password" | "number" | "textarea" | "select" | "boolean" | "csv" | "file";
  placeholder?: string;
  description?: string;
  options?: FieldOption[];
  rows?: number;
  accept?: string;
  min?: number;
  step?: number;
  required?: boolean;
};

type FeedbackState =
  | {
      variant: "success" | "error" | "info" | "warning";
      title: string;
      message: string;
    }
  | null;

export function ActionFormCard({
  title,
  description,
  fields,
  initialValues,
  submitLabel,
  pendingLabel,
  submitVariant = "primary",
  disabled,
  resetKey,
  warning,
  badge,
  footer,
  onSubmit,
}: {
  title: string;
  description: string;
  fields: ActionField[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  pendingLabel?: string;
  submitVariant?: ButtonProps["variant"];
  disabled?: boolean;
  resetKey?: string;
  warning?: string;
  badge?: string;
  footer?: ReactNode | ((context: { values: Record<string, unknown>; isPending: boolean }) => ReactNode);
  onSubmit: (values: Record<string, unknown>) => Promise<{
    result?: unknown;
    feedback?: FeedbackState;
    reset?: boolean;
  } | void>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [result, setResult] = useState<unknown>();

  useEffect(() => {
    setValues(initialValues ?? {});
    setFeedback(null);
    setResult(undefined);
  }, [resetKey]);

  const isSubmitDisabled = disabled || isPending;
  const columnsClass = useMemo(() => {
    const hasWideField = fields.some((field) => field.kind === "textarea" || field.kind === "csv");
    return hasWideField ? "space-y-4" : "grid gap-4 md:grid-cols-2";
  }, [fields]);

  const updateValue = (key: string, nextValue: unknown) => {
    setValues((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const submit = async () => {
    setFeedback(null);
    setResult(undefined);
    setIsPending(true);

    try {
      const outcome = await onSubmit(values);
      if (outcome?.result !== undefined) {
        setResult(outcome.result);
      }
      if (outcome?.feedback) {
        setFeedback(outcome.feedback);
      } else {
        setFeedback({
          variant: "success",
          title: "Request completed",
          message: `${title} finished successfully.`,
        });
      }
      if (outcome?.reset) {
        setValues(initialValues ?? {});
      }
    } catch (error) {
      setFeedback({
        variant: "error",
        title: "Request failed",
        message: error instanceof Error ? error.message : "The request failed.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {badge ? <Badge>{badge}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {warning ? <StatusBanner title="Operator note" variant="warning">{warning}</StatusBanner> : null}

        <div className={columnsClass}>
          {fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(nextValue) => updateValue(field.key, nextValue)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isSubmitDisabled} onClick={submit} variant={submitVariant}>
            {isPending ? pendingLabel ?? `${submitLabel}…` : submitLabel}
          </Button>
          {typeof footer === "function" ? footer({ values, isPending }) : footer}
        </div>

        {feedback ? (
          <StatusBanner title={feedback.title} variant={feedback.variant}>
            {feedback.message}
          </StatusBanner>
        ) : null}

        {result !== undefined ? <JsonView value={result} /> : null}
      </CardContent>
    </Card>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: ActionField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="font-semibold text-stone-100">{field.label}</p>
          {field.description ? <p className="mt-1 text-sm text-stone-400">{field.description}</p> : null}
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  return (
    <div className={field.kind === "textarea" || field.kind === "csv" ? "space-y-2" : "space-y-2"}>
      <Label htmlFor={field.key}>{field.label}</Label>
      <FieldInput field={field} value={value} onChange={onChange} />
      {field.description ? <p className="text-sm text-stone-500">{field.description}</p> : null}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ActionField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.kind) {
    case "textarea":
      return (
        <Textarea
          id={field.key}
          placeholder={field.placeholder}
          rows={field.rows}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "csv":
      return (
        <Textarea
          id={field.key}
          placeholder={field.placeholder}
          rows={field.rows ?? 4}
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(event) => onChange(splitCsv(event.target.value))}
        />
      );
    case "select":
      return (
        <Select
          id={field.key}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case "number":
      return (
        <Input
          id={field.key}
          min={field.min}
          placeholder={field.placeholder}
          step={field.step}
          type="number"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        />
      );
    case "password":
      return (
        <Input
          id={field.key}
          placeholder={field.placeholder}
          type="password"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "file":
      return (
        <Input
          accept={field.accept}
          id={field.key}
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              onChange("");
              return;
            }
            onChange(await fileToBase64(file));
          }}
        />
      );
    case "text":
    default:
      return (
        <Input
          id={field.key}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}
