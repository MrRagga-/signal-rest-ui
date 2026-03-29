import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/app/app-state";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApiConsoleMutation } from "@/lib/api/signal-hooks";
import { buildBodyTemplate, endpointCatalog, type EndpointFieldMeta, type EndpointMeta, type EndpointParameterMeta } from "@/lib/api/swagger";
import { splitCsv, tryParseJson } from "@/lib/utils";
import { RequireActiveProfile } from "@/routes/route-helpers";

export function ApiRoute() {
  const { activeAccountNumber } = useAppState();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState(endpointCatalog[0]?.id ?? "");
  const [pathValues, setPathValues] = useState<Record<string, unknown>>({});
  const [queryValues, setQueryValues] = useState<Record<string, unknown>>({});
  const [bodyValues, setBodyValues] = useState<Record<string, unknown>>({});
  const [bodyText, setBodyText] = useState("{}");
  const [rawMode, setRawMode] = useState(false);
  const consoleMutation = useApiConsoleMutation();

  const filteredEndpoints = useMemo(
    () =>
      endpointCatalog.filter((endpoint) =>
        `${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.tags.join(" ")}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase()),
      ),
    [deferredSearch],
  );

  const selectedEndpoint =
    filteredEndpoints.find((endpoint) => endpoint.id === selectedId) || filteredEndpoints[0];

  useEffect(() => {
    if (!selectedEndpoint) {
      return;
    }
    setSelectedId(selectedEndpoint.id);
    setRawMode(false);
    setPathValues(
      Object.fromEntries(
        selectedEndpoint.parameters
          .filter((parameter) => parameter.in === "path")
          .map((parameter) => [parameter.name, getDefaultParameterValue(parameter, activeAccountNumber)]),
      ),
    );
    setQueryValues(
      Object.fromEntries(
        selectedEndpoint.parameters
          .filter((parameter) => parameter.in === "query")
          .map((parameter) => [parameter.name, getDefaultParameterValue(parameter, activeAccountNumber)]),
      ),
    );

    const typedBodyValues = Object.fromEntries(
      selectedEndpoint.bodyFields.map((field) => [
        field.key,
        getDefaultBodyFieldValue(field, activeAccountNumber),
      ]),
    );
    setBodyValues(typedBodyValues);
    const bodyTemplate = buildBodyTemplate(
      selectedEndpoint,
      activeAccountNumber ? { number: activeAccountNumber } : {},
    );
    setBodyText(
      bodyTemplate === undefined ? "{}" : JSON.stringify(bodyTemplate, null, 2),
    );
  }, [activeAccountNumber, selectedEndpoint?.id]);

  if (!selectedEndpoint) {
    return null;
  }

  const pathParams = selectedEndpoint.parameters.filter((parameter) => parameter.in === "path");
  const queryParams = selectedEndpoint.parameters.filter((parameter) => parameter.in === "query");

  return (
    <RequireActiveProfile>
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Endpoint catalog</CardTitle>
              <CardDescription>
                Search the vendored Swagger surface and promote uncommon calls into a smaller operator console.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by tag, path, or summary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
              {filteredEndpoints.map((endpoint) => (
                <button
                  key={endpoint.id}
                  className={`w-full rounded-[1.3rem] border p-4 text-left transition ${
                    endpoint.id === selectedEndpoint.id
                      ? "border-emerald-300/30 bg-emerald-400/10"
                      : "border-white/8 bg-white/[0.03] hover:border-white/14"
                  }`}
                  type="button"
                  onClick={() => setSelectedId(endpoint.id)}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                    {endpoint.tags[0]}
                  </p>
                  <p className="mt-2 font-semibold">{endpoint.summary}</p>
                  <p className="mt-1 font-mono text-xs text-stone-400">
                    {endpoint.method} {endpoint.path}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{selectedEndpoint.summary}</CardTitle>
              <CardDescription>{selectedEndpoint.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="font-mono text-sm text-stone-300">
                {selectedEndpoint.method} {selectedEndpoint.path}
              </p>
            </div>

            {pathParams.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pathParams.map((parameter) => (
                  <ParameterField
                    key={parameter.name}
                    parameter={parameter}
                    value={pathValues[parameter.name]}
                    onChange={(nextValue) =>
                      setPathValues((current) => ({
                        ...current,
                        [parameter.name]: nextValue,
                      }))
                    }
                  />
                ))}
              </div>
            ) : null}

            {queryParams.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {queryParams.map((parameter) => (
                  <ParameterField
                    key={parameter.name}
                    parameter={parameter}
                    value={queryValues[parameter.name]}
                    onChange={(nextValue) =>
                      setQueryValues((current) => ({
                        ...current,
                        [parameter.name]: nextValue,
                      }))
                    }
                  />
                ))}
              </div>
            ) : null}

            {selectedEndpoint.bodySchemaRef ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="font-semibold text-stone-100">Request body</p>
                    <p className="mt-1 text-sm text-stone-400">
                      {selectedEndpoint.bodySchemaRef}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-300">
                      {rawMode ? "Raw JSON mode" : "Typed fields"}
                    </span>
                    <Switch checked={rawMode} onCheckedChange={setRawMode} />
                  </div>
                </div>

                {rawMode ? (
                  <div className="space-y-2">
                    <Label>Body JSON</Label>
                    <Textarea
                      className="min-h-56 font-mono"
                      value={bodyText}
                      onChange={(event) => setBodyText(event.target.value)}
                    />
                  </div>
                ) : selectedEndpoint.bodyFields.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedEndpoint.bodyFields.map((field) => (
                      <BodyField
                        key={field.key}
                        field={field}
                        value={bodyValues[field.key]}
                        onChange={(nextValue) =>
                          setBodyValues((current) => ({
                            ...current,
                            [field.key]: nextValue,
                          }))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Body template</Label>
                    <Textarea className="min-h-56 font-mono" readOnly value={bodyText} />
                  </div>
                )}
              </div>
            ) : null}

            <Button
              disabled={consoleMutation.isPending}
              onClick={() =>
                executeEndpoint(
                  consoleMutation.mutate,
                  selectedEndpoint,
                  pathValues,
                  queryValues,
                  rawMode ? bodyText : buildTypedBody(selectedEndpoint.bodyFields, bodyValues),
                )
              }
            >
              {consoleMutation.isPending ? "Executing…" : "Run request"}
            </Button>

            <JsonView
              value={
                consoleMutation.data ??
                consoleMutation.error ??
                {
                  status: "Ready",
                  hint: "Select parameters and run a request.",
                }
              }
            />
          </CardContent>
        </Card>
      </div>
    </RequireActiveProfile>
  );
}

function executeEndpoint(
  mutate: ReturnType<typeof useApiConsoleMutation>["mutate"],
  endpoint: EndpointMeta,
  pathValues: Record<string, unknown>,
  queryValues: Record<string, unknown>,
  bodyValue: unknown,
) {
  let path = endpoint.path;
  Object.entries(pathValues).forEach(([key, value]) => {
    path = path.replace(`{${key}}`, encodeURIComponent(String(value ?? "")));
  });

  const query = Object.fromEntries(
    Object.entries(queryValues)
      .map(([key, value]) => [key, normalizeConsoleValue(value)])
      .filter(([, value]) => value !== undefined),
  );
  const body =
    typeof bodyValue === "string"
      ? bodyValue.trim()
        ? tryParseJson(bodyValue, bodyValue)
        : undefined
      : bodyValue;

  mutate({
    path,
    method: endpoint.method,
    query,
    body: endpoint.bodySchemaRef ? body : undefined,
  });
}

function getDefaultParameterValue(parameter: EndpointParameterMeta, activeAccountNumber?: string) {
  if (parameter.name === "number" && activeAccountNumber) {
    return activeAccountNumber;
  }

  switch (parameter.kind) {
    case "boolean":
      return false;
    case "csv":
      return [];
    default:
      return "";
  }
}

function getDefaultBodyFieldValue(field: EndpointFieldMeta, activeAccountNumber?: string) {
  if (field.key === "number" && activeAccountNumber) {
    return activeAccountNumber;
  }
  if (field.kind === "json") {
    return field.defaultValue === undefined ? "" : JSON.stringify(field.defaultValue, null, 2);
  }
  return field.defaultValue ?? (field.kind === "csv" ? [] : field.kind === "boolean" ? false : "");
}

function buildTypedBody(fields: EndpointFieldMeta[], bodyValues: Record<string, unknown>) {
  if (!fields.length) {
    return undefined;
  }

  return Object.fromEntries(
    fields
      .map((field) => [field.key, coerceTypedValue(field, bodyValues[field.key])] as const)
      .filter(([, value]) => value !== undefined),
  );
}

function coerceTypedValue(field: EndpointFieldMeta, value: unknown) {
  switch (field.kind) {
    case "boolean":
      return Boolean(value);
    case "number":
      return value === "" || value === undefined ? undefined : Number(value);
    case "csv":
      return Array.isArray(value) ? value : splitCsv(String(value ?? ""));
    case "json":
      return String(value ?? "").trim() ? tryParseJson(String(value), String(value)) : undefined;
    default: {
      const stringValue = String(value ?? "").trim();
      return stringValue ? stringValue : undefined;
    }
  }
}

function normalizeConsoleValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length ? value : undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

function ParameterField({
  parameter,
  value,
  onChange,
}: {
  parameter: EndpointParameterMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`param-${parameter.in}-${parameter.name}`}>{parameter.name}</Label>
      {renderFieldControl(
        `param-${parameter.in}-${parameter.name}`,
        parameter.kind,
        value,
        onChange,
        parameter.enum,
      )}
      {parameter.description ? (
        <p className="text-sm text-stone-500">{parameter.description}</p>
      ) : null}
    </div>
  );
}

function BodyField({
  field,
  value,
  onChange,
}: {
  field: EndpointFieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`body-${field.key}`}>{field.label}</Label>
      {renderFieldControl(`body-${field.key}`, field.kind, value, onChange, field.options)}
      {field.description ? <p className="text-sm text-stone-500">{field.description}</p> : null}
    </div>
  );
}

function renderFieldControl(
  id: string,
  kind: EndpointFieldMeta["kind"],
  value: unknown,
  onChange: (value: unknown) => void,
  options?: string[],
) {
  switch (kind) {
    case "boolean":
      return (
        <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4">
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        />
      );
    case "select":
      return (
        <Select id={id} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select…</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    case "csv":
      return (
        <Textarea
          id={id}
          rows={4}
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(event) => onChange(splitCsv(event.target.value))}
        />
      );
    case "json":
      return (
        <Textarea
          id={id}
          rows={8}
          className="font-mono"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "text":
    default:
      return (
        <Input
          id={id}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
