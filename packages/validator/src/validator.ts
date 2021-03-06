import * as jsonschema from "jsonschema";
import {
  IJsonRpcValidator,
  isJsonRpcRequest,
  isJsonRpcResult,
  validateJsonRpcError,
  JsonRpcSchema,
  JsonRpcPayload,
  JsonRpcValidation,
  JsonRpcSchemaMap,
} from "@json-rpc-tools/utils";

export class JsonRpcValidator implements IJsonRpcValidator {
  constructor(public schemas: JsonRpcSchemaMap) {
    this.schemas = schemas;
  }

  public isSupported(method: string): boolean {
    return Object.keys(this.schemas).includes(method);
  }

  public getSchema(method: string): JsonRpcSchema {
    const schema = this.schemas[method];
    if (typeof schema === "undefined") {
      throw new Error(`JSON-RPC method not supported: ${method}`);
    }
    return schema;
  }

  public validate(payload: JsonRpcPayload, method?: string): JsonRpcValidation {
    let result: jsonschema.ValidatorResult;
    if (isJsonRpcRequest(payload)) {
      const schema = this.getSchema(payload.method);
      result = jsonschema.validate(payload.params, schema.params);
    } else if (isJsonRpcResult(payload)) {
      if (typeof method === "undefined") {
        throw new Error("Method argument required for validating JsonRpcResult");
      }
      const schema = this.getSchema(method);
      result = jsonschema.validate(payload.result, schema.result);
    } else {
      return validateJsonRpcError(payload);
    }
    return result.valid
      ? {
          valid: true,
        }
      : {
          valid: false,
          error: result.toString(),
        };
  }
}

export default JsonRpcValidator;
