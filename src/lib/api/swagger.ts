import rawSwagger from "../../../docs/swagger.json";

type SwaggerSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  example?: unknown;
  items?: SwaggerSchema;
  properties?: Record<string, SwaggerSchema>;
};

type SwaggerParameter = {
  name: string;
  in: "path" | "query" | "body";
  description?: string;
  required?: boolean;
  type?: string;
  collectionFormat?: string;
  enum?: string[];
  items?: SwaggerSchema;
  schema?: SwaggerSchema;
};

type SwaggerOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: SwaggerParameter[];
};

type SwaggerDocument = {
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, SwaggerOperation>>;
  definitions?: Record<string, SwaggerSchema>;
};

export interface EndpointFieldMeta {
  key: string;
  label: string;
  kind: "text" | "number" | "boolean" | "select" | "csv" | "json";
  description?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: unknown;
}

export interface EndpointParameterMeta extends SwaggerParameter {
  kind: EndpointFieldMeta["kind"];
}

export interface EndpointMeta {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: EndpointParameterMeta[];
  bodySchemaRef?: string;
  bodyFields: EndpointFieldMeta[];
  bodyTemplate?: unknown;
}

const swagger = rawSwagger as SwaggerDocument;

export const swaggerInfo = swagger.info;

export function getSchemaRefName(ref?: string) {
  return ref?.replace("#/definitions/", "");
}

function resolveSchema(schema?: SwaggerSchema): SwaggerSchema | undefined {
  if (!schema) {
    return undefined;
  }

  if (!schema.$ref) {
    return schema;
  }

  const refName = getSchemaRefName(schema.$ref);
  return refName ? swagger.definitions?.[refName] : undefined;
}

function inferFieldKind(schema?: SwaggerSchema, fallbackType?: string): EndpointFieldMeta["kind"] {
  const resolved = resolveSchema(schema) ?? schema;
  const type = resolved?.type ?? fallbackType;

  if (resolved?.enum?.length) {
    return "select";
  }
  if (type === "boolean") {
    return "boolean";
  }
  if (type === "integer" || type === "number") {
    return "number";
  }
  if (type === "array") {
    return resolved?.items?.type === "string" ? "csv" : "json";
  }
  if (type === "object" || resolved?.properties) {
    return "json";
  }

  return "text";
}

function buildDefaultValue(schema?: SwaggerSchema, fallbackType?: string, depth = 0): unknown {
  if (!schema) {
    if (fallbackType === "array") {
      return [];
    }
    if (fallbackType === "boolean") {
      return false;
    }
    if (fallbackType === "integer" || fallbackType === "number") {
      return "";
    }
    return "";
  }

  const resolved = resolveSchema(schema) ?? schema;
  if (resolved.example !== undefined) {
    return resolved.example;
  }
  if (resolved.enum?.length) {
    return resolved.enum[0];
  }
  if (resolved.type === "boolean") {
    return false;
  }
  if (resolved.type === "integer" || resolved.type === "number") {
    return "";
  }
  if (resolved.type === "array") {
    if (resolved.items?.type === "string") {
      return [];
    }
    return depth > 1 ? [] : [buildDefaultValue(resolved.items, undefined, depth + 1)];
  }
  if (resolved.type === "object" || resolved.properties) {
    if (depth > 2) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(resolved.properties ?? {}).map(([key, property]) => [
        key,
        buildDefaultValue(property, undefined, depth + 1),
      ]),
    );
  }

  return "";
}

function buildBodyFields(schema?: SwaggerSchema): EndpointFieldMeta[] {
  const resolved = resolveSchema(schema);
  const properties = resolved?.properties ?? {};

  return Object.entries(properties).map(([key, property]) => ({
    key,
    label: key,
    kind: inferFieldKind(property),
    description: property.description,
    required: false,
    options: property.enum,
    defaultValue: buildDefaultValue(property),
  }));
}

function toParameterMeta(parameter: SwaggerParameter): EndpointParameterMeta {
  const kind =
    parameter.type === "array" && parameter.items?.type === "string"
      ? "csv"
      : inferFieldKind(parameter.schema, parameter.type);

  return {
    ...parameter,
    kind,
  };
}

export function buildBodyTemplate(endpoint: EndpointMeta, overrides: Record<string, unknown> = {}) {
  if (!endpoint.bodyTemplate || typeof endpoint.bodyTemplate !== "object") {
    return endpoint.bodyTemplate;
  }

  return {
    ...(endpoint.bodyTemplate as Record<string, unknown>),
    ...overrides,
  };
}

const rawEndpointCatalog: EndpointMeta[] = Object.entries(swagger.paths)
  .flatMap(([path, operations]) =>
    Object.entries(operations).map(([method, operation]) => {
      const parameters = [...(operation.parameters ?? [])].filter((parameter) =>
        method.toLowerCase() === "get" ? parameter.in !== "body" : true,
      );
      const seenPathParams = new Set(
        parameters.filter((parameter) => parameter.in === "path").map((parameter) => parameter.name),
      );

      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        const paramName = match[1];
        if (!seenPathParams.has(paramName)) {
          parameters.push({
            name: paramName,
            in: "path",
            description: `${paramName} path parameter`,
            required: true,
            type: "string",
          });
        }
      }

      const bodyParameter = parameters.find((parameter) => parameter.in === "body");

      return {
        id: `${method}:${path}`,
        method: method.toUpperCase(),
        path,
        summary: operation.summary ?? `${method.toUpperCase()} ${path}`,
        description: operation.description ?? "",
        tags: operation.tags ?? ["Uncategorized"],
        parameters: parameters.map(toParameterMeta),
        bodySchemaRef: bodyParameter?.schema?.$ref,
        bodyFields: buildBodyFields(bodyParameter?.schema),
        bodyTemplate: bodyParameter?.schema ? buildDefaultValue(bodyParameter.schema) : undefined,
      };
    }),
  )
  .sort((left, right) => {
    const leftKey = `${left.tags[0]}-${left.summary}`;
    const rightKey = `${right.tags[0]}-${right.summary}`;
    return leftKey.localeCompare(rightKey);
  });

export const endpointCatalog = rawEndpointCatalog;
