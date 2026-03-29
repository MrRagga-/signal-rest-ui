import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import swagger2openapi from "swagger2openapi";

const sourcePath = resolve(process.cwd(), "docs/swagger.json");
const targetPath = resolve(process.cwd(), "docs/swagger.openapi.json");

const raw = JSON.parse(await readFile(sourcePath, "utf8"));
const { openapi } = await swagger2openapi.convertObj(raw, {
  patch: true,
  warnOnly: true,
});

for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
  const requiredPathParams = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);

  for (const [method, operation] of Object.entries(pathItem ?? {})) {
    if (!operation || typeof operation !== "object") {
      continue;
    }

    const isGetOperation = method.toLowerCase() === "get";
    const bodyParam = (operation.parameters ?? []).find((parameter) => parameter.in === "body");
    const requestBodySchema = operation.requestBody?.content?.["application/json"]?.schema;
    const responseSchema = bodyParam?.schema ?? requestBodySchema;

    if (isGetOperation && responseSchema) {
      operation.responses = operation.responses ?? {};
      const okResponse = operation.responses["200"] ?? {};
      const content = okResponse.content ?? {};
      const existingJsonContent = content["application/json"] ?? {};

      operation.responses["200"] = {
        ...okResponse,
        content: {
          ...content,
          "application/json": {
            ...existingJsonContent,
            schema: existingJsonContent.schema ?? responseSchema,
          },
        },
      };
    }

    operation.parameters = (operation.parameters ?? []).filter((parameter) => {
      if (!isGetOperation) {
        return true;
      }

      // Upstream Swagger currently declares a request body for one GET operation.
      // Strip body params from GET methods so generated clients remain callable.
      return parameter.in !== "body";
    });

    if (isGetOperation) {
      delete operation.requestBody;
    }

    for (const paramName of requiredPathParams) {
      const exists = operation.parameters.some(
        (parameter) => parameter.in === "path" && parameter.name === paramName,
      );

      if (!exists) {
        operation.parameters.push({
          name: paramName,
          in: "path",
          required: true,
          description: `${paramName} path parameter`,
          schema: { type: "string" },
        });
      }
    }
  }
}

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, JSON.stringify(openapi, null, 2));

console.log(`Prepared ${targetPath}`);
